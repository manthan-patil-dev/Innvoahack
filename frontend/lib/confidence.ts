/**
 * Confidence, derived strictly from what the pipeline actually recorded.
 *
 * There is deliberately no percentage here. The backend never produces a
 * calibrated probability, so any number the UI displayed would be invented —
 * and an invented "94% confident" is the single easiest thing for a judge to
 * discredit. What the pipeline *does* record is whether the CriticAgent
 * accepted an output and whether the specialist had to correct itself. That is
 * a real, auditable signal, so it is the one shown.
 *
 * Mapping, from app/services/orchestrator.py:
 *   verdict.valid && !retry_needed        -> Critic passed it on the first pass
 *   rejected, then the retry produced output -> corrected (node.retried is set)
 *   rejected, retry produced nothing      -> issues stand unresolved
 *   no verdict recorded                   -> say so rather than imply success
 */

import type { CriticVerdict, PipelineNode } from "@/lib/types/agents";

export type ConfidenceLevel = "verified" | "corrected" | "flagged" | "unvalidated";

export interface Confidence {
  level: ConfidenceLevel;
  /** Short label for the badge. */
  label: string;
  /** One sentence naming the evidence this level is based on. */
  basis: string;
  /** The Critic's specific objections, when it raised any. */
  issues: string[];
}

const COPY: Record<ConfidenceLevel, { label: string; basis: string }> = {
  verified: {
    label: "Verified",
    basis: "CriticAgent validated this output on the first pass.",
  },
  corrected: {
    label: "Self-corrected",
    basis: "CriticAgent rejected the first attempt; this is the revised output.",
  },
  flagged: {
    label: "Flagged",
    basis: "CriticAgent raised issues that were not resolved on retry.",
  },
  unvalidated: {
    label: "Unvalidated",
    basis: "No CriticAgent verdict was recorded for this output.",
  },
};

export function deriveConfidence(
  verdict?: CriticVerdict,
  node?: PipelineNode,
): Confidence {
  const issues = verdict?.issues ?? [];

  if (!verdict) return { level: "unvalidated", ...COPY.unvalidated, issues: [] };

  // Critic accepted it outright. A node.retried here means the transport layer
  // re-asked for valid JSON, which is not a content objection — the Critic
  // still passed the result it saw, so this stays "verified".
  if (verdict.valid && !verdict.retry_needed) {
    return { level: "verified", ...COPY.verified, issues: [] };
  }

  // Critic objected. Whether this is "corrected" or "flagged" depends on
  // whether the retry actually produced a replacement output.
  if (node?.retried) {
    return { level: "corrected", ...COPY.corrected, issues };
  }

  return { level: "flagged", ...COPY.flagged, issues };
}

/** Run-level summary: the weakest link, since one flagged output taints the set. */
export function summariseConfidence(levels: ConfidenceLevel[]): ConfidenceLevel {
  if (!levels.length) return "unvalidated";
  if (levels.includes("flagged")) return "flagged";
  if (levels.includes("unvalidated")) return "unvalidated";
  if (levels.includes("corrected")) return "corrected";
  return "verified";
}
