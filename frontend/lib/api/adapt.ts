/**
 * ChatResponse (wire) -> RunState (what the components already render).
 *
 * The two shapes are deliberately near-identical, so this file stays small.
 * It exists so that any future drift between the backend contract and the UI
 * contract is absorbed here instead of leaking into components.
 */

import type {
  AgentResult,
  ChatResponse,
  PipelineNode,
  RawAgentResult,
  RunState,
  SpecialistAgent,
} from "@/lib/types/agents";

const SPECIALIST_NAMES: ReadonlySet<string> = new Set<SpecialistAgent>([
  "FinanceAgent",
  "TravelAgent",
  "SecurityAgent",
  "DocumentAgent",
]);

export function isSpecialist(agent: string): boolean {
  return SPECIALIST_NAMES.has(agent);
}

/**
 * Narrow the wire envelope to the UI's discriminated union.
 *
 * The cast is the one unchecked step in the pipeline. It is safe because
 * backend/contract_test.py asserts every specialist payload's exact key set
 * against these same interfaces — if that test passes, this cast holds.
 * Unknown agents are dropped rather than rendered as a broken card.
 */
export function toAgentResults(raw: RawAgentResult[]): AgentResult[] {
  return raw.filter((r) => isSpecialist(r.agent)).map((r) => r as unknown as AgentResult);
}

/** Backend nodes arrive already settled; the UI replays them from `pending`. */
export function toPendingNodes(nodes: PipelineNode[]): PipelineNode[] {
  return nodes.map((n) => ({
    ...n,
    attempts: n.attempts ?? 1,
    status: "pending" as const,
  }));
}

export function toRunState(data: ChatResponse): RunState {
  return {
    id: data.session_id,
    query: data.query,
    nodes: toPendingNodes(data.nodes),
    results: toAgentResults(data.results),
    response: data.response,
    status: "running",
    backend: data.backend,
    dispatching: false,
    // Carried so the UI can explain *why* each output exists and whether the
    // Critic accepted it. All three arrive on every response already.
    intent: data.intent,
    plan: data.plan,
    critic: data.critic,
  };
}

/* --- Staged reveal --------------------------------------------------------
   The reveal is driven by the real per-node elapsedMs the backend measured,
   not by invented constants. We only rescale it: a live run where one agent
   takes 9s should not hold the trace hostage for 9s, and a mock run where
   everything takes 250ms should not flash past unreadably.
   ------------------------------------------------------------------------ */

export interface RevealOptions {
  /** Total wall time the whole reveal is allowed to occupy. */
  maxTotalMs?: number;
  /** Floor per node, so fast agents stay legible. */
  minStepMs?: number;
  /** Ceiling per node, so one slow agent cannot dominate. */
  maxStepMs?: number;
}

/**
 * Per-node display durations, proportional to real timings but bounded.
 * Returns one duration per node, in order.
 */
export function revealDurations(
  nodes: PipelineNode[],
  { maxTotalMs = 2600, minStepMs = 190, maxStepMs = 700 }: RevealOptions = {},
): number[] {
  if (nodes.length === 0) return [];

  const clamped = nodes.map((n) => {
    const real = typeof n.elapsedMs === "number" && n.elapsedMs > 0 ? n.elapsedMs : minStepMs;
    return Math.min(maxStepMs, Math.max(minStepMs, real));
  });

  const total = clamped.reduce((a, b) => a + b, 0);
  if (total <= maxTotalMs) return clamped;

  // Compress proportionally, but never below a readable floor.
  const scale = maxTotalMs / total;
  return clamped.map((d) => Math.max(110, Math.round(d * scale)));
}
