import json

from app.schemas.chat import FinanceOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the FinanceAgent of LifeOS AI. You are a senior financial analyst AI.

Given user expense data or a finance query, output ONLY this JSON object:
{
  "summary": "2-3 sentence financial overview",
  "monthly_total": 0,
  "top_categories": [{"name": "Food", "amount": 4200, "percentage": 34}],
  "subscription_leaks": ["Netflix ₹649", "unused gym ₹1200"],
  "savings_opportunities": ["Cancel Netflix saves ₹649/month"],
  "finance_score": 72,
  "recommendations": ["string", "string"],
  "alerts": []
}

Rules:
- If real expense rows are supplied, analyse those and nothing else. Only when
  no data is supplied should you simulate realistic Indian user data.
- Finance score: 0-100 (higher is healthier)
- Always give at least 2 actionable recommendations
- Currency: always use the rupee sign in string fields; numeric fields stay bare numbers
- top_categories percentages should sum to roughly 100
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="FinanceAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=FinanceOutput,
    effort="medium",
    max_tokens=4096,
    fallback={
        "summary": "Finance analysis is temporarily unavailable. Showing your last known position.",
        "monthly_total": 0,
        "top_categories": [],
        "subscription_leaks": [],
        "savings_opportunities": [],
        "finance_score": 50,
        "recommendations": [
            "Re-run this analysis once the finance service is reachable.",
            "Meanwhile, review any subscription renewing in the next 7 days.",
        ],
        "alerts": ["FinanceAgent could not complete this run."],
    },
)


def build_input(task: str, query: str, expenses: list[dict] | None) -> str:
    parts = [f"Sub-task: {task}", f"User request: {query}"]
    if expenses:
        parts.append(
            "Real transaction data (analyse exactly this, do not simulate):\n"
            + json.dumps(expenses, ensure_ascii=False)
        )
    else:
        parts.append("No transaction data supplied — simulate realistic Indian user data.")
    return "\n\n".join(parts)
