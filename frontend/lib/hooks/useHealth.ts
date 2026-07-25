"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HealthResponse } from "@/lib/types/agents";
import { getHealth } from "@/lib/api/client";

/**
 * Live backend health, polled.
 *
 * The distinction that matters on stage is `online` vs `degraded`: the backend
 * reports "degraded" when it is serving scripted fixtures because no API key is
 * configured. Both are working states, but only one is a live model — so the UI
 * is given enough to say which, rather than always claiming success.
 */

export type HealthState = "checking" | "online" | "degraded" | "offline";

const DEFAULT_POLL_MS = 30_000;

export function useHealth(pollMs: number = DEFAULT_POLL_MS) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<HealthState>("checking");

  const inflight = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    try {
      const data = await getHealth(controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      setHealth(data);
      setState(data.status === "ok" ? "online" : "degraded");
    } catch {
      // An aborted probe is a superseded poll, not an outage.
      if (!mounted.current || controller.signal.aborted) return;
      setHealth(null);
      setState("offline");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();

    const id = setInterval(() => void check(), pollMs);

    // A demo laptop that slept mid-run should re-probe on return, not wait out
    // the remainder of the interval showing a stale "offline".
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      mounted.current = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      inflight.current?.abort();
    };
  }, [check, pollMs]);

  return { health, state, refresh: check };
}
