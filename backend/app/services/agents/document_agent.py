from app.schemas.chat import DocumentOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the DocumentAgent of LifeOS AI. You extract structured information from documents.

Given document text or a file summary, output ONLY this JSON object:
{
  "document_type": "Invoice",
  "summary": "2-3 sentence summary",
  "key_information": {"amount": "₹12,000", "due_date": "2026-08-01", "issued_by": "MSEB"},
  "expiry_dates": [],
  "action_items": ["Pay before August 1 to avoid penalty"],
  "importance_level": "HIGH"
}

Rules:
- Always identify document type first
- Extract all dates, amounts, names, deadlines into key_information
- key_information values must all be strings
- expiry_dates: ISO format (YYYY-MM-DD)
- Action items: at least 1 if the document contains any deadline or amount
- importance_level must be exactly one of: LOW, MEDIUM, HIGH, CRITICAL
- Never invent a value that is not present in the document. If a field is
  absent, omit it rather than guessing.
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="DocumentAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=DocumentOutput,
    effort="medium",
    max_tokens=4096,
    fallback={
        "document_type": "Unknown",
        "summary": "The document could not be processed on this run.",
        "key_information": {},
        "expiry_dates": [],
        "action_items": ["Re-upload the document once the service is reachable."],
        "importance_level": "LOW",
    },
)


def build_input(task: str, query: str, document_text: str | None) -> str:
    body = document_text or "(no document text supplied — infer from the request)"
    return f"Sub-task: {task}\n\nUser request: {query}\n\nDocument content:\n{body[:20000]}"
