from app.schemas.chat import IntentOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the IntentAgent of LifeOS AI. Your only job is to classify the user's request.

Output ONLY this JSON object:
{
  "domains": ["finance", "travel"],
  "complexity": "multi",
  "requires_file": false,
  "clarification_needed": false,
  "clarification_question": null
}

Rules:
- domains: one or more of finance, security, document, travel, productivity, general
- complexity: "single" if one domain is involved, "multi" if more than one
- requires_file: true if the request refers to a document, file, PDF, bill or invoice
- Never ask for clarification unless it is genuinely impossible to proceed
- If uncertain between domains, include all likely ones
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="IntentAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=IntentOutput,
    effort="low",
    max_tokens=1024,
    fallback={
        "domains": ["general"],
        "complexity": "single",
        "requires_file": False,
        "clarification_needed": False,
        "clarification_question": None,
    },
)


def build_input(query: str, has_document: bool) -> str:
    flag = "A document was attached to this request." if has_document else "No document attached."
    return f"{flag}\n\nUser request: {query}"
