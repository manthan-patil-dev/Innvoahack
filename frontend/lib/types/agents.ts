/* ============================================================================
   LifeOS AI — agent contracts

   These interfaces are a direct transcription of the Phase 5 agent JSON
   schemas. They are the integration contract: the mock fixtures satisfy them
   today, and the real FastAPI /api/chat response must satisfy the same
   interfaces tomorrow. When the backend lands, only lib/mock is replaced —
   no component changes.
   ========================================================================== */

export type Domain = "finance" | "security" | "document" | "travel" | "productivity" | "general";

export type AgentName =
  | "IntentAgent"
  | "PlannerAgent"
  | "RouterAgent"
  | "FinanceAgent"
  | "SecurityAgent"
  | "DocumentAgent"
  | "TravelAgent"
  | "CriticAgent"
  | "ResponseAgent";

/** The Router only ever dispatches to these four. CriticAgent is invoked by
 *  LifeCore after each specialist, never planned as a step. */
export type SpecialistAgent = "FinanceAgent" | "SecurityAgent" | "DocumentAgent" | "TravelAgent";

/* --- IntentAgent ---------------------------------------------------------- */

export interface IntentOutput {
  domains: Domain[];
  complexity: "single" | "multi";
  requires_file: boolean;
  clarification_needed: boolean;
  clarification_question: string | null;
}

/* --- PlannerAgent --------------------------------------------------------- */

export interface PlanStep {
  step: number;
  task: string;
  agent: SpecialistAgent;
  input_key: string;
}

/* --- FinanceAgent --------------------------------------------------------- */

export interface CategorySlice {
  name: string;
  amount: number;
  percentage: number;
}

export interface FinanceOutput {
  summary: string;
  monthly_total: number;
  top_categories: CategorySlice[];
  subscription_leaks: string[];
  savings_opportunities: string[];
  finance_score: number;
  recommendations: string[];
  alerts: string[];
}

/* --- TravelAgent ---------------------------------------------------------- */

export interface ItineraryDay {
  day: number;
  activities: string[];
  estimated_cost: number;
}

export interface BudgetBreakdown {
  transport: number;
  hotel: number;
  food: number;
  activities: number;
  buffer: number;
}

export interface TravelOutput {
  destination: string;
  budget_total: number;
  itinerary: ItineraryDay[];
  budget_breakdown: BudgetBreakdown;
  packing_checklist: string[];
  tips: string[];
  warnings: string[];
  travel_score: number;
}

/* --- SecurityAgent -------------------------------------------------------- */

export type RiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SecurityOutput {
  input_type: "url" | "email" | "message";
  risk_score: number;
  risk_level: RiskLevel;
  threat_type: string;
  explanation: string;
  red_flags: string[];
  recommendation: string;
  safe_alternative: string | null;
}

/* --- DocumentAgent -------------------------------------------------------- */

export type ImportanceLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface DocumentOutput {
  document_type: string;
  summary: string;
  key_information: Record<string, string>;
  expiry_dates: string[];
  action_items: string[];
  importance_level: ImportanceLevel;
}

/* --- CriticAgent ---------------------------------------------------------- */

export interface CriticVerdict {
  agent: AgentName;
  valid: boolean;
  issues: string[];
  retry_needed: boolean;
  corrected_output: unknown | null;
}

/* --- ResponseAgent -------------------------------------------------------- */

export interface PriorityAlert {
  level: "CRITICAL" | "HIGH" | "NORMAL";
  message: string;
}

export interface ActionLogEntry {
  step: number;
  agent: AgentName;
  action: string;
  status: "SUCCESS" | "RETRY" | "FAILED";
}

export interface Reminder {
  id: string;
  title: string;
  due: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  source: AgentName;
}

export interface ResponseOutput {
  headline: string;
  unified_report: string;
  priority_alerts: PriorityAlert[];
  action_log: ActionLogEntry[];
  dashboard_updates: {
    finance_score: number;
    security_score: number;
    life_score: number;
    reminders: Reminder[];
  };
}

/* --- Discriminated union over specialist results -------------------------- */

export type AgentResult =
  | { agent: "FinanceAgent"; output: FinanceOutput }
  | { agent: "TravelAgent"; output: TravelOutput }
  | { agent: "SecurityAgent"; output: SecurityOutput }
  | { agent: "DocumentAgent"; output: DocumentOutput };

/* --- Client-side pipeline state ------------------------------------------- */

export type NodeStatus = "pending" | "running" | "success" | "failed";

export interface PipelineNode {
  step: number;
  agent: AgentName;
  /** One-sentence description of what this node is doing. */
  label: string;
  status: NodeStatus;
  /** Wall time once the node settles. */
  elapsedMs?: number;
  attempts: number;
  /** Surfaced deliberately — visible self-correction is a feature. */
  retried?: boolean;
  note?: string;
}

export interface RunState {
  id: string;
  query: string;
  nodes: PipelineNode[];
  results: AgentResult[];
  response: ResponseOutput | null;
  status: "idle" | "running" | "complete" | "error";
  error?: string;
  /** Which LLM backend served this run ("mock" | "groq" | "openai" | "lyzr"). */
  backend?: string;
  /** Supabase `runs.id`, once the run has been saved. Absent means it has not
   *  been (yet, or at all) — the UI degrades rather than blocking on it. */
  persistedId?: string;
  /** True while awaiting /api/chat, before the first node is revealed. */
  dispatching?: boolean;
  /** How LifeCore read the request — drives the routing rationale. */
  intent?: IntentOutput;
  /** The sub-task each specialist was actually given. */
  plan?: PlanStep[];
  /** CriticAgent's verdict per specialist output. */
  critic?: CriticVerdict[];
}

/* --- Wire types for /api/chat --------------------------------------------- */

/** Request body for POST /api/chat. Mirrors backend ChatRequest. */
export interface ChatRequestPayload {
  message: string;
  session_id?: string | null;
  document_text?: string | null;
  expenses?: Record<string, unknown>[] | null;
}

/** Raw specialist envelope as it arrives. Narrowed to AgentResult in the adapter. */
export interface RawAgentResult {
  agent: string;
  output: Record<string, unknown>;
}

/** Response body from POST /api/chat. Mirrors backend ChatResponse. */
export interface ChatResponse {
  session_id: string;
  query: string;
  backend: string;
  intent: IntentOutput;
  selected_agents: string[];
  results: RawAgentResult[];
  response: ResponseOutput;
  plan: PlanStep[];
  nodes: PipelineNode[];
  critic: CriticVerdict[];
}

/** Response body from GET /api/health. Mirrors backend HealthResponse. */
export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  version: string;
  backend: string;
  model: string;
  agents: string[];
}

/** One scripted end-to-end run. Mirrors what /api/chat will stream back. */
export interface Scenario {
  id: string;
  query: string;
  intent: IntentOutput;
  plan: PlanStep[];
  nodes: PipelineNode[];
  results: AgentResult[];
  critic: CriticVerdict[];
  response: ResponseOutput;
}
