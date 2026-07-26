from app.schemas.chat import ResponseOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the ResponseAgent of LifeOS AI — the final synthesis layer.

You receive all validated agent outputs and must generate ONE unified response.

Output ONLY this JSON object:
{
  "headline": "One sentence summary of what was accomplished",
  "unified_report": "Markdown formatted, well-structured, comprehensive response to the user",
  "priority_alerts": [{"level": "CRITICAL", "message": "string"}],
  "action_log": [{"step": 1, "agent": "FinanceAgent", "action": "Analyzed expenses", "status": "SUCCESS"}],
  "dashboard_updates": {
    "finance_score": 72,
    "security_score": 95,
    "life_score": 83,
    "reminders": [{"id": "r1", "title": "string", "due": "2026-08-01", "priority": "HIGH", "source": "FinanceAgent"}]
  }
}

Rules:
- unified_report is written for the user, not the developer. Markdown, with
  headings. Lead with the thing that matters most — if one agent found a
  CRITICAL risk, that goes first regardless of task order.
- Synthesise across agents. Do not simply concatenate their outputs; say what
  they mean together.
- priority_alerts level must be one of: CRITICAL, HIGH, NORMAL
- action_log status must be one of: SUCCESS, RETRY, FAILED. Include one entry
  per pipeline step, and mark retried steps as RETRY — users should see the
  self-correction, not have it hidden.
- life_score = average of the available domain scores, rounded to an integer
- reminders: due dates in YYYY-MM-DD. Empty list if nothing has a deadline.
- Tone: professional but warm, like a smart personal advisor. No filler.
- Output valid JSON only. No prose, no markdown fences around the JSON itself."""

agent = Agent(
    name="ResponseAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=ResponseOutput,
    effort="medium",
    max_tokens=4000,
    fallback={
        "headline": "Your request was processed, but the final synthesis step did not complete.",
        "unified_report": (
            "## Partial result\n\n"
            "The specialist agents ran, but the synthesis layer could not complete. "
            "Their individual findings are shown above and are still valid.\n\n"
            "Re-run the request to get the unified report."
        ),
        "priority_alerts": [
            {"level": "NORMAL", "message": "Synthesis step did not complete on this run."}
        ],
        "action_log": [],
        "dashboard_updates": {
            "finance_score": 0,
            "security_score": 0,
            "life_score": 0,
            "reminders": [],
        },
    },
)


def build_input(query: str, agent_payloads: str, trace: str) -> str:
    return (
        f"Original user request: {query}\n\n"
        f"Validated agent outputs:\n{agent_payloads}\n\n"
        f"Pipeline trace (use this to build action_log — preserve RETRY statuses):\n{trace}"
    )
