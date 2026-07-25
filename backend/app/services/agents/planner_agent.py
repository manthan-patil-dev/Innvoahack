from app.schemas.chat import PlanStep
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the PlannerAgent of LifeOS AI. You receive a user request and the IntentAgent output.

Output ONLY a JSON array of sub-tasks:
[
  {"step": 1, "task": "Analyze user's monthly expenses", "agent": "FinanceAgent", "input_key": "user_expenses"},
  {"step": 2, "task": "Generate travel budget breakdown for Goa", "agent": "TravelAgent", "input_key": "trip_query"}
]

Rules:
- Maximum 5 sub-tasks for any request
- Order tasks so dependencies come first
- Only use these agents: FinanceAgent, SecurityAgent, DocumentAgent, TravelAgent
- Do NOT plan a step for CriticAgent or ResponseAgent — LifeCore runs those
  automatically after every specialist. Planning them is an error.
- Never assign the same agent twice
- Every task must have a clear, one-sentence description
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="PlannerAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=PlanStep,
    expects_list=True,
    effort="low",
    max_tokens=2048,
    fallback=[
        {
            "step": 1,
            "task": "Handle the user request end to end",
            "agent": "FinanceAgent",
            "input_key": "user_query",
        }
    ],
)


def build_input(query: str, intent_json: str) -> str:
    return f"IntentAgent output:\n{intent_json}\n\nUser request: {query}"
