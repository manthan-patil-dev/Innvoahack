"use client";

import { useEffect, useRef, useState } from "react";
import { useHealth, type HealthState } from "@/lib/hooks/useHealth";
import { API_BASE } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Live engine status, replacing what used to be a hardcoded "LifeCore online".
 *
 * Expanding it lists every agent the backend actually reports registered —
 * the cheapest honest proof that this is an orchestrator and not one model
 * behind a chat box.
 */

const LABEL: Record<HealthState, string> = {
  checking: "Checking",
  online: "LifeCore online",
  degraded: "Demo fixtures",
  offline: "LifeCore offline",
};

/** Local tones rather than StatusDot — its four states do not map to health,
 *  and a permanently pulsing dot in the header would be noise. */
const DOT: Record<HealthState, string> = {
  checking: "bg-ink-subtle",
  online: "bg-success",
  degraded: "bg-gold",
  offline: "bg-danger",
};

const TEXT: Record<HealthState, string> = {
  checking: "text-ink-subtle",
  online: "text-ink-muted",
  degraded: "text-ink-muted",
  offline: "!text-danger",
};

export function HealthChip() {
  const { health, state, refresh } = useHealth();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const agents = health?.agents ?? [];

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => {
          // Re-probe as it opens, so the panel never shows a stale roster.
          if (!open) void refresh();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Engine status: ${LABEL[state]}. Show details.`}
        className="inline-flex items-center gap-2 rounded-sm px-1.5 py-1 transition-colors duration-fast ease-io hover:bg-surface-sunken"
      >
        <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", DOT[state])} aria-hidden />
        {/* The dot survives on mobile; only the wordmark collapses. */}
        <span className={cn("eyebrow hidden sm:inline", TEXT[state])}>{LABEL[state]}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Engine status"
          // Anchoring to the chip overflows the left edge on narrow screens —
          // the chip is not flush right. Below sm it drops to a viewport-width
          // sheet under the header instead.
          className="fixed left-4 right-4 top-[4.25rem] z-30 rounded-sm border bg-surface p-4 text-left shadow-e2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[260px]"
        >
          <div className="flex items-center gap-2">
            <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", DOT[state])} aria-hidden />
            <span className={cn("eyebrow", TEXT[state])}>{LABEL[state]}</span>
          </div>

          {state === "offline" ? (
            <p className="mt-3 text-meta text-ink-muted">
              No response from <span className="text-ink">{API_BASE}</span>. Start the backend and
              this reconnects on its own.
            </p>
          ) : health ? (
            <>
              <dl className="mt-3 space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-meta text-ink-subtle">Backend</dt>
                  <dd className="text-meta text-ink">{health.backend}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-meta text-ink-subtle">Model</dt>
                  <dd className="truncate text-meta text-ink">{health.model}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-meta text-ink-subtle">Agents</dt>
                  <dd className="text-meta tnum text-ink">{agents.length} registered</dd>
                </div>
              </dl>

              {agents.length ? (
                <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-3">
                  {agents.map((agent) => (
                    <li key={agent} className="flex items-center gap-1.5">
                      <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-success" aria-hidden />
                      <span className="truncate text-meta text-ink-muted">
                        {agent.replace(/Agent$/, "")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {state === "degraded" ? (
                <p className="mt-3 border-t pt-3 text-meta text-ink-subtle">
                  Orchestration is real; agent content is scripted. Set an API key in{" "}
                  <span className="text-ink-muted">backend/.env</span> for live output.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-meta text-ink-subtle">Contacting LifeCore…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
