/**
 * Cross-agent action collection.
 *
 * Every item here is already somewhere in the payload — inside a specialist
 * card, the priority alerts, or the reminder list. Scattered across four cards
 * they read as observations; gathered and attributed they read as a worklist,
 * which is what a user actually wants out of nine agents.
 *
 * Nothing is invented: each item keeps the agent that raised it, so any row can
 * be traced back to the output it came from.
 */

import type { AgentResult, RunState } from "@/lib/types/agents";

export type ActionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ActionKind = "alert" | "reminder" | "recommendation" | "action" | "expiry" | "warning";

export interface ActionItem {
  id: string;
  text: string;
  /** The agent whose output raised this. */
  source: string;
  kind: ActionKind;
  priority: ActionPriority;
  /** Only reminders and expiries carry one. */
  due?: string;
}

const RANK: Record<ActionPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

/** Alert levels and importance levels share names but not ranges. */
function fromRisk(level: string): ActionPriority {
  if (level === "CRITICAL") return "CRITICAL";
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function collectFromResult(result: AgentResult): ActionItem[] {
  const items: ActionItem[] = [];
  const at = (kind: ActionKind, i: number) => `${result.agent}-${kind}-${i}`;

  switch (result.agent) {
    case "SecurityAgent": {
      const o = result.output;
      if (o.recommendation) {
        items.push({
          id: at("action", 0),
          text: o.recommendation,
          source: result.agent,
          kind: "action",
          priority: fromRisk(o.risk_level),
        });
      }
      if (o.safe_alternative) {
        items.push({
          id: at("recommendation", 0),
          text: `Use ${o.safe_alternative} instead.`,
          source: result.agent,
          kind: "recommendation",
          priority: fromRisk(o.risk_level) === "CRITICAL" ? "HIGH" : "MEDIUM",
        });
      }
      break;
    }

    case "DocumentAgent": {
      const o = result.output;
      const p = fromRisk(o.importance_level);
      o.action_items.forEach((text, i) =>
        items.push({ id: at("action", i), text, source: result.agent, kind: "action", priority: p }),
      );
      o.expiry_dates.forEach((due, i) =>
        items.push({
          id: at("expiry", i),
          text: `${o.document_type} — dated ${due}`,
          source: result.agent,
          kind: "expiry",
          priority: p,
          due,
        }),
      );
      break;
    }

    case "FinanceAgent": {
      const o = result.output;
      o.alerts.forEach((text, i) =>
        items.push({ id: at("alert", i), text, source: result.agent, kind: "alert", priority: "HIGH" }),
      );
      o.recommendations.forEach((text, i) =>
        items.push({
          id: at("recommendation", i),
          text,
          source: result.agent,
          kind: "recommendation",
          priority: "MEDIUM",
        }),
      );
      break;
    }

    case "TravelAgent": {
      const o = result.output;
      // Warnings are the tradeoffs the plan made and the risks it carries, so
      // they outrank the tips below.
      o.warnings.forEach((text, i) =>
        items.push({
          id: at("warning", i),
          text,
          source: result.agent,
          kind: "warning",
          priority: "MEDIUM",
        }),
      );
      // Travel tips are written as concrete next steps — what to book now, where
      // the same thing is cheaper — so they belong on the worklist rather than
      // only inside the trip card, which is where they used to stop.
      o.tips.forEach((text, i) =>
        items.push({
          id: at("recommendation", i),
          text,
          source: result.agent,
          kind: "recommendation",
          priority: "LOW",
        }),
      );
      break;
    }
  }

  return items;
}

/** Normalised for de-duplication — the ResponseAgent frequently restates a
 *  specialist's alert verbatim in priority_alerts. */
function key(text: string): string {
  return text.trim().toLowerCase().replace(/[.\s]+$/, "");
}

export function collectActions(run: RunState): ActionItem[] {
  const items: ActionItem[] = [];

  // Reminders first: they are the only items carrying a real due date.
  (run.response?.dashboard_updates.reminders ?? []).forEach((r) =>
    items.push({
      id: `reminder-${r.id}`,
      text: r.title,
      source: r.source,
      kind: "reminder",
      priority: r.priority,
      due: r.due,
    }),
  );

  (run.response?.priority_alerts ?? []).forEach((a, i) =>
    items.push({
      id: `alert-${i}`,
      text: a.message,
      source: "ResponseAgent",
      kind: "alert",
      priority: a.level === "NORMAL" ? "MEDIUM" : a.level,
    }),
  );

  run.results.forEach((r) => items.push(...collectFromResult(r)));

  // Highest priority wins a duplicate, so sort before de-duplicating.
  items.sort((a, b) => RANK[a.priority] - RANK[b.priority]);

  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item.text);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
