"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { ActionItem, ActionPriority } from "@/lib/actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

/**
 * Everything this run says to do, in one list, each row attributed to the
 * agent that raised it.
 *
 * The tick is a real checklist and nothing more. LifeOS has no integrations,
 * so there is deliberately no "Cancel subscription" or "Block sender" button
 * here — a control that looks like it acts on your bank but silently does
 * nothing is the kind of thing that reads as a demo lie under questioning.
 *
 * Ticks persist to Supabase once the run has been saved. Before that (and if
 * the save failed) they are session-local, and the copy below says which.
 */

const DOT: Record<ActionPriority, string> = {
  CRITICAL: "bg-danger",
  HIGH: "bg-gold",
  MEDIUM: "bg-ink-subtle",
  LOW: "bg-ink-subtle",
};

const KIND_LABEL: Record<string, string> = {
  alert: "Alert",
  reminder: "Reminder",
  recommendation: "Suggested",
  action: "Action",
  expiry: "Dated",
  warning: "Warning",
};

export function ActionCenter({
  items,
  /** Supabase `runs.id`. Absent until the run has been saved. */
  runId,
}: {
  items: ActionItem[];
  runId?: string;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());

  if (items.length === 0) return null;

  const toggle = (id: string) => {
    let nextDone = false;

    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      nextDone = next.has(id);
      return next;
    });

    // Optimistic: the checkbox has already moved. A failed write leaves the tick
    // where the user put it for this session rather than snapping back, which
    // would read as the UI fighting them.
    if (!runId) return;
    void fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId, clientKey: id, done: nextDone }),
    }).catch(() => {});
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-4 border-b px-6 py-5">
        <div>
          <SectionLabel>Action center</SectionLabel>
          <p className="mt-2 max-w-prose text-meta text-ink-subtle">
            Collected from every agent that ran.{" "}
            {runId
              ? "Ticks are saved to your account — but LifeOS does not act on your accounts."
              : "Ticking is local to this session — LifeOS does not act on your accounts."}
          </p>
        </div>
        <span className="shrink-0 text-meta tnum text-ink-subtle">
          {done.size} / {items.length}
        </span>
      </div>

      <ul className="divide-y">
        {items.map((item) => {
          const isDone = done.has(item.id);

          return (
            <li key={item.id}>
              <label
                className={cn(
                  "flex cursor-pointer gap-3.5 px-6 py-4 transition-colors duration-fast ease-io",
                  "hover:bg-surface-sunken",
                )}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(item.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-fast ease-io",
                    isDone ? "border-success bg-success-soft text-success" : "border-line-strong",
                    "peer-focus-visible:[outline:2px_solid_var(--gold)] peer-focus-visible:[outline-offset:2px]",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" strokeWidth={2.5} /> : null}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-ui transition-colors duration-fast ease-io",
                      isDone ? "text-ink-subtle line-through" : "text-ink",
                    )}
                  >
                    {item.text}
                  </span>

                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-subtle">
                    <span
                      className={cn("inline-block h-1 w-1 shrink-0 rounded-full", DOT[item.priority])}
                      aria-hidden
                    />
                    <span>{KIND_LABEL[item.kind] ?? item.kind}</span>
                    <span aria-hidden>·</span>
                    <span>{item.source}</span>
                    {item.due ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tnum">Due {item.due}</span>
                      </>
                    ) : null}
                  </span>
                </span>

                {item.priority === "CRITICAL" || item.priority === "HIGH" ? (
                  <Badge
                    variant={item.priority === "CRITICAL" ? "danger" : "gold"}
                    className="mt-0.5 shrink-0"
                  >
                    {item.priority}
                  </Badge>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
