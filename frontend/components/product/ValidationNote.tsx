import type { ConfidenceLevel } from "@/lib/confidence";
import type { Confidence } from "@/lib/confidence";
import { cn } from "@/lib/utils";

/**
 * The provenance caption under a specialist result: what the agent was asked
 * to do, and what the Critic made of the answer.
 *
 * Deliberately subordinate to the card above it — a hairline rule and meta
 * type, not another bordered panel. This is a footnote, not a second headline.
 */

const RULE: Record<ConfidenceLevel, string> = {
  verified: "border-success",
  corrected: "border-gold-line",
  flagged: "border-danger",
  unvalidated: "border-line",
};

const DOT: Record<ConfidenceLevel, string> = {
  verified: "bg-success",
  corrected: "bg-gold",
  flagged: "bg-danger",
  unvalidated: "bg-ink-subtle",
};

const LABEL: Record<ConfidenceLevel, string> = {
  verified: "text-success",
  corrected: "text-ink",
  flagged: "text-danger",
  unvalidated: "text-ink-subtle",
};

export function ValidationNote({
  confidence,
  task,
  className,
}: {
  confidence: Confidence;
  /** The sub-task the Planner assigned this agent, when known. */
  task?: string;
  className?: string;
}) {
  const { level, label, basis, issues } = confidence;

  return (
    <div className={cn("mt-2.5 border-l-2 pl-3.5", RULE[level], className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", DOT[level])} aria-hidden />
        <span className={cn("eyebrow", LABEL[level])}>{label}</span>
        <span className="text-meta text-ink-subtle">{basis}</span>
      </div>

      {task ? (
        <p className="mt-1.5 text-meta text-ink-subtle">
          <span className="text-ink-muted">Asked to</span> {task.charAt(0).toLowerCase() + task.slice(1)}
        </p>
      ) : null}

      {issues.length ? (
        <ul className="mt-1.5 space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="text-meta text-ink-subtle">
              <span className="text-ink-muted">Raised —</span> {issue}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
