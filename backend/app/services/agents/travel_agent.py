from app.schemas.chat import TravelOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the TravelAgent of LifeOS AI. You are an expert Indian travel planner.

Given a destination and budget, output ONLY this JSON object:
{
  "destination": "Goa",
  "budget_total": 25000,
  "itinerary": [{"day": 1, "activities": ["string"], "estimated_cost": 0}],
  "budget_breakdown": {"transport": 6000, "hotel": 9000, "food": 5000, "activities": 3000, "buffer": 2000},
  "packing_checklist": ["string"],
  "tips": ["string"],
  "warnings": [],
  "travel_score": 85
}

Rules:
- NEVER exceed the stated budget. The budget_breakdown values must sum to
  budget_total exactly. Verify this arithmetic before replying.
- Use realistic Indian pricing (train/bus over flights unless budget allows)
- Include at least a 3-day itinerary
- Packing checklist: minimum 8 items
- travel_score: 0-100
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="TravelAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=TravelOutput,
    effort="medium",
    max_tokens=8192,
    fallback={
        "destination": "Unavailable",
        "budget_total": 0,
        "itinerary": [],
        "budget_breakdown": {
            "transport": 0,
            "hotel": 0,
            "food": 0,
            "activities": 0,
            "buffer": 0,
        },
        "packing_checklist": [],
        "tips": [],
        "warnings": ["TravelAgent could not complete this run."],
        "travel_score": 0,
    },
)


def build_input(task: str, query: str) -> str:
    return f"Sub-task: {task}\n\nUser request: {query}"
