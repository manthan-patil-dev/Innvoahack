"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentResult, ChatRequestPayload, ChatResponse, RunState } from "@/lib/types/agents";
import { ApiError, postChat } from "@/lib/api/client";
import { isSpecialist, revealDurations, toRunState } from "@/lib/api/adapt";
import { collectActions } from "@/lib/actions";

/**
 * Save a finished run to Supabase, then attach its row id to the run on screen.
 *
 * Deliberately fire-and-forget: the answer is already rendered, and a database
 * that is slow or down must not be able to take it away. A failure logs and the
 * run simply never gains a `persistedId`, which the Action Center reads as
 * "ticking is local to this session".
 */
async function persistRun(settled: RunState, chat: ChatResponse): Promise<string | null> {
  try {
    const response = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat, actions: collectActions(settled) }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { runId?: string };
    return body.runId ?? null;
  } catch {
    return null;
  }
}

/**
 * Drives one orchestration run against the real backend.
 *
 * POST /api/chat returns the completed run in a single response, so the trace
 * is replayed rather than streamed. The replay is still driven entirely by
 * backend data — node order, labels, retries and per-node elapsedMs all come
 * from the server; only the playback rate is rescaled for legibility. No
 * hardcoded fixtures are involved.
 *
 * When the backend grows a streaming endpoint, the reveal loop is deleted and
 * events are applied as they arrive. RunState does not change either way.
 */

export function useRun() {
  const [run, setRun] = useState<RunState | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inflight = useRef<AbortController | null>(null);
  const runSeq = useRef(0);
  const mounted = useRef(true);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const cancelInflight = useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      inflight.current?.abort();
      inflight.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    cancelInflight();
    setRun(null);
  }, [clearTimers, cancelInflight]);

  const submit = useCallback(
    async (query: string, extra?: Omit<ChatRequestPayload, "message">) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      clearTimers();
      cancelInflight();

      const seq = ++runSeq.current;
      const controller = new AbortController();
      inflight.current = controller;

      // Phase 1 — dispatched, awaiting LifeCore. No nodes are known yet, so the
      // UI shows its dispatching state rather than inventing placeholder steps.
      setRun({
        id: `pending-${seq}`,
        query: trimmed,
        nodes: [],
        results: [],
        response: null,
        status: "running",
        dispatching: true,
      });

      let data;
      try {
        data = await postChat({ message: trimmed, ...extra }, controller.signal);
      } catch (err) {
        // A superseded or unmounted run must not clobber newer state.
        if (controller.signal.aborted || seq !== runSeq.current || !mounted.current) return;
        setRun((prev) =>
          prev
            ? {
                ...prev,
                status: "error",
                dispatching: false,
                error:
                  err instanceof ApiError
                    ? err.message
                    : "Something went wrong reaching LifeCore.",
              }
            : prev,
        );
        return;
      }

      if (seq !== runSeq.current || !mounted.current) return;
      inflight.current = null;

      // Phase 2 — the full run is in hand; replay it node by node.
      const settled = toRunState(data);
      const durations = revealDurations(settled.nodes);

      setRun({ ...settled, nodes: settled.nodes, results: [], response: null });

      // Save alongside the reveal, not before it — the trace animation must not
      // wait on a database round trip.
      void persistRun(settled, data).then((persistedId) => {
        if (!persistedId || seq !== runSeq.current || !mounted.current) return;
        setRun((prev) => (prev ? { ...prev, persistedId } : prev));
      });

      let elapsed = 0;

      settled.nodes.forEach((node, index) => {
        const duration = durations[index];

        // Node enters `running`.
        timers.current.push(
          setTimeout(() => {
            if (seq !== runSeq.current) return;
            setRun((prev) =>
              prev
                ? {
                    ...prev,
                    nodes: prev.nodes.map((n, i) =>
                      i === index ? { ...n, status: "running" } : n,
                    ),
                  }
                : prev,
            );
          }, elapsed),
        );

        elapsed += duration;

        // Node settles to its real backend status, and its result (if any)
        // is revealed at the same moment.
        const isLast = index === settled.nodes.length - 1;
        timers.current.push(
          setTimeout(() => {
            if (seq !== runSeq.current) return;

            const result: AgentResult | undefined = isSpecialist(node.agent)
              ? settled.results.find((r) => r.agent === node.agent)
              : undefined;

            setRun((prev) => {
              if (!prev) return prev;
              const already = result && prev.results.some((r) => r.agent === result.agent);
              return {
                ...prev,
                nodes: prev.nodes.map((n, i) =>
                  i === index
                    ? { ...n, status: node.status === "failed" ? "failed" : "success" }
                    : n,
                ),
                results: result && !already ? [...prev.results, result] : prev.results,
                response: isLast ? settled.response : prev.response,
                status: isLast ? "complete" : prev.status,
              };
            });
          }, elapsed),
        );
      });

      // Degenerate case: a run with no nodes still has to finish.
      if (settled.nodes.length === 0) {
        setRun((prev) =>
          prev ? { ...prev, response: settled.response, status: "complete" } : prev,
        );
      }
    },
    [clearTimers, cancelInflight],
  );

  return { run, submit, reset, isRunning: run?.status === "running" };
}
