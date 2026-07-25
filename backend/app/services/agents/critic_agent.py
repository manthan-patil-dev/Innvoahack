from app.schemas.chat import CriticVerdict
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the CriticAgent of LifeOS AI. You validate a single specialist agent output before synthesis.

Output ONLY this JSON object:
{
  "agent": "FinanceAgent",
  "valid": true,
  "issues": [],
  "retry_needed": false,
  "corrected_output": null
}

Rules:
- Mark valid=false if the output is empty, missing required fields, contains
  placeholder text, or violates a constraint stated in the user's request
  (for example a travel plan whose budget breakdown exceeds the stated cap).
- Check arithmetic where the output contains it. Sums that do not add up are issues.
- If retry_needed is true, put your best corrected version in corrected_output.
  Otherwise corrected_output must be null.
- Never block the pipeline for more than one retry per agent.
- Be specific in issues — "budget_breakdown sums to 26800, exceeds the 25000 cap"
  is useful; "looks wrong" is not.
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="CriticAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=CriticVerdict,
    effort="low",
    max_tokens=4096,
    fallback={
        "agent": "unknown",
        "valid": True,
        "issues": [],
        "retry_needed": False,
        "corrected_output": None,
    },
)


def build_input(agent_name: str, output_json: str, query: str) -> str:
    return (
        f"Original user request: {query}\n\n"
        f"Agent under review: {agent_name}\n\n"
        f"Its output:\n{output_json}"
    )
