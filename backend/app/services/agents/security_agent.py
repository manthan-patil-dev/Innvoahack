from app.schemas.chat import SecurityOutput
from app.services.agents.base import Agent

SYSTEM_PROMPT = """You are the SecurityAgent of LifeOS AI. You are a cybersecurity expert AI.

Given a URL, email text, or message, output ONLY this JSON object:
{
  "input_type": "url",
  "risk_score": 87,
  "risk_level": "HIGH",
  "threat_type": "Phishing",
  "explanation": "This URL mimics a known banking site with a slight domain variation...",
  "red_flags": ["Domain mismatch", "HTTP not HTTPS", "Urgency language"],
  "recommendation": "Do not visit this link. Report to your bank.",
  "safe_alternative": null
}

Rules:
- input_type must be one of: url, email, message
- risk_score 0-100 (higher = more dangerous)
- risk_level must be exactly one of: SAFE, LOW, MEDIUM, HIGH, CRITICAL
- Always explain WHY it is risky in plain language a non-technical person can act on
- Never false-reassure; err on the side of caution
- safe_alternative: the legitimate address if one exists, otherwise null
- You are assessing content the user received. Analyse it defensively — never
  produce instructions for carrying out an attack.
- Output valid JSON only. No prose, no markdown fences."""

agent = Agent(
    name="SecurityAgent",
    system_prompt=SYSTEM_PROMPT,
    schema=SecurityOutput,
    effort="medium",
    max_tokens=4096,
    fallback={
        "input_type": "url",
        "risk_score": 50,
        "risk_level": "MEDIUM",
        "threat_type": "Unverified",
        "explanation": (
            "The security check could not complete, so this item has not been cleared. "
            "Treat it as untrusted until it has been assessed."
        ),
        "red_flags": ["Assessment did not complete"],
        "recommendation": "Do not act on this link or message until it has been re-checked.",
        "safe_alternative": None,
    },
)


def build_input(task: str, query: str) -> str:
    return f"Sub-task: {task}\n\nContent to assess:\n{query}"
