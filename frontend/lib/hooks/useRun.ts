"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentResult, RunState } from "@/lib/types/agents";
import { matchScenario } from "@/lib/mock/agentOutputs";

/**
 * Drives one orchestration run.
 *
 * Today it replays a scripted scenario on a timer. When /api/chat lands, only
 * the body of `submit` changes — it will consume the streamed node/result
 * events instead of scheduling them. RunState is already the shape the UI
 * renders, so no component changes.
 */

const DURATION_MS: Record<string, number> = {
  IntentAgent: 420,
  PlannerAgent: 520,
  RouterAgent: 300,
  FinanceAgent: 900,
  TravelAgent: 1100,
  SecurityAgent: 950,
  DocumentAgent: 1000,
  CriticAgent: 600,
  ResponseAgent: 700,
};

const SPECIALISTS = new Set(["FinanceAgent", "TravelAgent", "SecurityAgent", "DocumentAgent"]);

export function useRun() {
  const [run, setRun] = useState<RunState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setRun(null);
  }, [clearTimers]);

  const submit = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      clearTimers();
      const scenario = matchScenario(trimmed);

      setRun({
        id: `${scenario.id}-${trimmed.length}`,
        query: trimmed,
        nodes: scenario.nodes.map((n) => ({ ...n, status: "pending" })),
        results: [],
        response: null,
        status: "running",
      });

      let elapsed = 0;

      scenario.nodes.forEach((node, index) => {
        const duration = DURATION_MS[node.agent] ?? 600;

        // Node enters `running`.
        const startAt = elapsed;
        timers.current.push(
          setTimeout(() => {
            setRun((prev) =>
              prev
                ? {
                    ...prev,
                    nodes: prev.nodes.map((n, i) => (i === index ? { ...n, status: "running" } : n)),
                  }
                : prev,
            );
          }, startAt),
        );

        elapsed += duration;

        // Node settles, and its result (if any) is revealed at the same moment.
        const settleAt = elapsed;
        const isLast = index === scenario.nodes.length - 1;
        timers.current.push(
          setTimeout(() => {
            const result: AgentResult | undefined = SPECIALISTS.has(node.agent)
              ? scenario.results.find((r) => r.agent === node.agent)
              : undefined;

            setRun((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                nodes: prev.nodes.map((n, i) =>
                  i === index ? { ...n, status: "success", elapsedMs: duration } : n,
                ),
                results: result ? [...prev.results, result] : prev.results,
                response: isLast ? scenario.response : prev.response,
                status: isLast ? "complete" : prev.status,
              };
            });
          }, settleAt),
        );
      });
    },
    [clearTimers],
  );

  return { run, submit, reset, isRunning: run?.status === "running" };
}
