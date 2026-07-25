"""
Wire contracts for /api/chat.

These are a 1:1 mirror of frontend/lib/types/agents.ts. The frontend was built
against those interfaces with mock fixtures; this module is the server side of
the same contract. Changing a field here means changing it there.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

Domain = Literal["finance", "security", "document", "travel", "productivity", "general"]

SpecialistAgent = Literal["FinanceAgent", "SecurityAgent", "DocumentAgent", "TravelAgent"]

AgentName = Literal[
    "IntentAgent",
    "PlannerAgent",
    "RouterAgent",
    "FinanceAgent",
    "SecurityAgent",
    "DocumentAgent",
    "TravelAgent",
    "CriticAgent",
    "ResponseAgent",
]


# --- IntentAgent -----------------------------------------------------------


class IntentOutput(BaseModel):
    domains: list[Domain] = Field(default_factory=lambda: ["general"])
    complexity: Literal["single", "multi"] = "single"
    requires_file: bool = False
    clarification_needed: bool = False
    clarification_question: str | None = None


# --- PlannerAgent ----------------------------------------------------------


class PlanStep(BaseModel):
    step: int
    task: str
    agent: SpecialistAgent
    input_key: str = "user_query"


# --- FinanceAgent ----------------------------------------------------------


class CategorySlice(BaseModel):
    name: str
    amount: float
    percentage: float


class FinanceOutput(BaseModel):
    summary: str
    monthly_total: float
    top_categories: list[CategorySlice] = Field(default_factory=list)
    subscription_leaks: list[str] = Field(default_factory=list)
    savings_opportunities: list[str] = Field(default_factory=list)
    finance_score: int
    recommendations: list[str] = Field(default_factory=list)
    alerts: list[str] = Field(default_factory=list)


# --- TravelAgent -----------------------------------------------------------


class ItineraryDay(BaseModel):
    day: int
    activities: list[str] = Field(default_factory=list)
    estimated_cost: float = 0


class BudgetBreakdown(BaseModel):
    transport: float = 0
    hotel: float = 0
    food: float = 0
    activities: float = 0
    buffer: float = 0


class TravelOutput(BaseModel):
    destination: str
    budget_total: float
    itinerary: list[ItineraryDay] = Field(default_factory=list)
    budget_breakdown: BudgetBreakdown = Field(default_factory=BudgetBreakdown)
    packing_checklist: list[str] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    travel_score: int = 0


# --- SecurityAgent ---------------------------------------------------------


class SecurityOutput(BaseModel):
    input_type: Literal["url", "email", "message"] = "url"
    risk_score: int
    risk_level: Literal["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
    threat_type: str
    explanation: str
    red_flags: list[str] = Field(default_factory=list)
    recommendation: str
    safe_alternative: str | None = None


# --- DocumentAgent ---------------------------------------------------------


class DocumentOutput(BaseModel):
    document_type: str
    summary: str
    key_information: dict[str, str] = Field(default_factory=dict)
    expiry_dates: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    importance_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"


# --- CriticAgent -----------------------------------------------------------


class CriticVerdict(BaseModel):
    agent: str
    valid: bool = True
    issues: list[str] = Field(default_factory=list)
    retry_needed: bool = False
    corrected_output: Any | None = None


# --- ResponseAgent ---------------------------------------------------------


class PriorityAlert(BaseModel):
    level: Literal["CRITICAL", "HIGH", "NORMAL"] = "NORMAL"
    message: str


class ActionLogEntry(BaseModel):
    step: int
    agent: str
    action: str
    status: Literal["SUCCESS", "RETRY", "FAILED"] = "SUCCESS"


class Reminder(BaseModel):
    id: str
    title: str
    due: str
    priority: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    source: str


class DashboardUpdates(BaseModel):
    finance_score: int = 0
    security_score: int = 0
    life_score: int = 0
    reminders: list[Reminder] = Field(default_factory=list)


class ResponseOutput(BaseModel):
    headline: str
    unified_report: str
    priority_alerts: list[PriorityAlert] = Field(default_factory=list)
    action_log: list[ActionLogEntry] = Field(default_factory=list)
    dashboard_updates: DashboardUpdates = Field(default_factory=DashboardUpdates)


# --- Pipeline state --------------------------------------------------------


class PipelineNode(BaseModel):
    step: int
    agent: str
    label: str
    status: Literal["pending", "running", "success", "failed"] = "success"
    elapsedMs: int | None = None  # camelCase: consumed directly by the frontend
    attempts: int = 1
    retried: bool = False
    note: str | None = None


class AgentResult(BaseModel):
    """Envelope over a specialist payload. The payload is validated against its
    specific model inside the agent, then dumped — so this stays a plain dict
    and Pydantic never has to guess which union member it is."""

    agent: str
    output: dict[str, Any]


# --- Request / response ----------------------------------------------------


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: str | None = None
    # Extracted document text, when the client has already parsed a file.
    document_text: str | None = None
    # Optional real expense rows; omitted means the FinanceAgent simulates.
    expenses: list[dict[str, Any]] | None = None


class ChatResponse(BaseModel):
    session_id: str
    query: str
    backend: str  # which LLM backend actually served this run

    # --- the six fields the spec requires, in contract order ---
    intent: IntentOutput  # 1. detected intent
    selected_agents: list[str]  # 2. selected agents
    results: list[AgentResult]  # 3. specialist outputs
    response: ResponseOutput  # 4. unified summary  (.headline/.unified_report)
    #                            5. priorities      (.priority_alerts)
    #                            6. actions         (.action_log)

    # --- supporting detail the frontend renders ---
    plan: list[PlanStep]
    nodes: list[PipelineNode]
    critic: list[CriticVerdict]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str = "lifeos-core"
    version: str = "0.1.0"
    backend: str
    model: str
    agents: list[str]
