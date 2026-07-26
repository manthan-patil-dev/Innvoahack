"""
Scripted completions for MOCK mode.

Mirrors frontend/lib/mock/agentOutputs.ts so the backend and the frontend tell
the same story with the same numbers. This is what serves the demo when no API
key is configured, and what the router degrades to if every live backend fails.
"""

from __future__ import annotations

import json
import re

FINANCE = {
    "summary": (
        "You spent ₹42,380 this month, about 9% more than your six-month average. "
        "Rent and dining account for nearly two thirds of it, and four subscriptions "
        "are drawing ₹2,217 a month with little or no use."
    ),
    "monthly_total": 42380,
    "top_categories": [
        {"name": "Rent", "amount": 15000, "percentage": 35},
        {"name": "Food & Dining", "amount": 11240, "percentage": 27},
        {"name": "Shopping", "amount": 5600, "percentage": 13},
        {"name": "Transport", "amount": 4100, "percentage": 10},
        {"name": "Subscriptions", "amount": 2890, "percentage": 7},
        {"name": "Other", "amount": 3550, "percentage": 8},
    ],
    "subscription_leaks": [
        "Netflix Premium ₹649 — last opened 41 days ago",
        "Gold's Gym ₹1,200 — no check-in for 9 weeks",
        "iCloud 200GB ₹219 — 12GB of 200GB used",
        "Spotify Duo ₹149 — second seat unused",
    ],
    "savings_opportunities": [
        "Downgrade Netflix Premium to Standard saves ₹250/month",
        "Cancel the unused gym membership saves ₹1,200/month",
        "Drop iCloud to the 50GB tier saves ₹144/month",
    ],
    "finance_score": 68,
    "recommendations": [
        "Cancel the gym membership and redirect ₹1,200 to a recurring deposit — it is your single largest dead cost.",
        "Cap dining at ₹8,000 next month; you have crossed ₹11,000 three months running.",
        "Set a ₹3,000 auto-transfer on the 2nd, before discretionary spending starts.",
    ],
    "alerts": ["Dining spend has exceeded its cap for three consecutive months."],
}

TRAVEL = {
    "destination": "Goa",
    "budget_total": 25000,
    "itinerary": [
        {
            "day": 1,
            "activities": [
                "Overnight sleeper from Mumbai, arrive Madgaon 09:40",
                "Check in at a guesthouse in Anjuna, drop bags",
                "Scooter rental for the full trip, ₹400/day",
                "Sunset at Vagator, dinner at a beach shack",
            ],
            "estimated_cost": 9200,
        },
        {
            "day": 2,
            "activities": [
                "Early ride to Arambol, breakfast at a beach shack",
                "Chapora Fort before the afternoon heat",
                "Saturday night market at Arpora",
            ],
            "estimated_cost": 7600,
        },
        {
            "day": 3,
            "activities": [
                "Old Goa churches, Basilica of Bom Jesus",
                "Panjim Latin Quarter walk, lunch at Viva Panjim",
                "Evening train back, departs Madgaon 19:15",
            ],
            "estimated_cost": 6200,
        },
    ],
    "budget_breakdown": {
        "transport": 6000,
        "hotel": 8500,
        "food": 5000,
        "activities": 3500,
        "buffer": 2000,
    },
    "packing_checklist": [
        "Government photo ID — mandatory for hotel check-in",
        "Driving licence, required for the scooter rental",
        "Two changes of swimwear",
        "Reef-safe sunscreen, SPF 50",
        "Light cotton layers, one full-sleeve for evenings",
        "Flip-flops and one pair of closed shoes for the forts",
        "Power bank and a universal charger",
        "Basic medical kit — ORS, antiseptic, motion sickness tablets",
        "₹3,000 in cash; several shacks are still cash-only",
        "Dry bag for phone and wallet on beach days",
    ],
    "tips": [
        "Book the sleeper at least 10 days out — Konkan Railway fills fast on weekends.",
        "Rent the scooter for the whole trip rather than per day; the daily rate drops to ₹400.",
        "Shacks north of Anjuna are roughly 30% cheaper than the Baga strip for the same food.",
        "Withdraw cash in Panjim, not at the beach ATMs — they run dry by Saturday evening.",
    ],
    "warnings": [
        # The tradeoff the plan actually made, not just a generic caution. This is
        # the line that shows the budget was held by a decision rather than luck.
        "Held to ₹25,000 by taking the sleeper both ways instead of flying — that "
        "buys back roughly ₹7,000 and costs about 11 hours each way.",
        "The ₹2,000 buffer is the whole margin. A single peak-rate night in Anjuna "
        "consumes it, and the plan then breaks the cap.",
        "This plan assumes a non-peak weekend. Rates rise sharply from 20 December.",
    ],
    "travel_score": 88,
}

SECURITY = {
    "input_type": "url",
    "risk_score": 94,
    "risk_level": "CRITICAL",
    "threat_type": "Credential phishing",
    "explanation": (
        "This link imitates HDFC Bank's login page using a lookalike domain. The real bank "
        "uses hdfcbank.com; this address is hdfcbank-secure-verify.in, which is registered to "
        "an unrelated party and was created 11 days ago. Legitimate banks do not move their "
        "login to a new domain, and they never ask you to re-verify through a link in a message."
    ),
    "red_flags": [
        "Lookalike domain — hdfcbank-secure-verify.in is not hdfcbank.com",
        "Domain registered 11 days ago",
        "No valid extended-validation certificate",
        "Page requests both your PIN and full card number",
        "Message uses account-suspension urgency to force a fast decision",
    ],
    "recommendation": (
        "Do not open this link and do not enter anything on it. If you have already entered "
        "details, call HDFC on the number printed on your card and block the card now."
    ),
    "safe_alternative": "https://www.hdfcbank.com",
}

DOCUMENT = {
    "document_type": "Electricity Bill",
    "summary": (
        "A Maharashtra State Electricity Board bill for the June–July 2026 cycle totalling "
        "₹12,480, due 1 August 2026. Consumption is 412 units, roughly 18% above the same "
        "cycle last year."
    ),
    "key_information": {
        "Issuer": "MSEB — Maharashtra State Electricity Board",
        "Consumer number": "170024881933",
        "Billing period": "18 Jun 2026 – 17 Jul 2026",
        "Units consumed": "412 kWh",
        "Amount due": "₹12,480",
        "Due date": "2026-08-01",
        "Late payment penalty": "₹186 after due date",
    },
    "expiry_dates": ["2026-08-01"],
    "action_items": [
        "Pay ₹12,480 before 1 August 2026 to avoid the ₹186 late fee.",
        "Consumption is 18% above last year's same cycle — worth checking the water heater and AC usage.",
    ],
    "importance_level": "HIGH",
}


def _extract_query(built_input: str) -> str:
    """Recover the raw user query from a built agent prompt.

    Agents receive framing text ("No document attached.") and, for the
    ResponseAgent, every specialist's JSON payload. Keyword-matching the whole
    prompt misclassifies on both — so match only the user's own words.
    """
    for marker in ("Original user request:", "User request:", "Content to assess:"):
        if marker in built_input:
            return built_input.split(marker, 1)[1].split("\n", 1)[0].strip()
    return built_input.split("\n", 1)[0].strip()


def _raw_domains(query: str) -> list[str]:
    """Domains the query actually matches. May legitimately be empty."""
    q = _extract_query(query).lower()
    domains: list[str] = []
    if re.search(r"goa|trip|travel|itinerar|vacation|holiday", q):
        domains.append("travel")
    if re.search(r"spend|expense|budget|money|subscription|finance|saving", q):
        domains.append("finance")
    if re.search(r"phish|scam|safe|link|url|suspicious|https?://", q):
        domains.append("security")
    if re.search(r"bill|invoice|document|pdf|summari[sz]e|receipt", q):
        domains.append("document")
    return domains


def matched_scenario(query: str) -> bool:
    """Whether the query hits one of the three scripted scenarios.

    Mock mode has fixtures for spending, trip planning and link/document
    safety, and nothing else. Anything else still runs the pipeline — the
    orchestration is genuine — but the specialist content is canned and has
    no relationship to what was asked. Callers use this to say so, rather
    than letting a question about the weather come back as a confident
    ₹42,380 spending analysis.
    """
    return bool(_raw_domains(query))


def _domains(query: str) -> list[str]:
    return _raw_domains(query) or ["finance"]


def _plan(query: str) -> list[dict]:
    mapping = {
        "travel": ("Build an itinerary within the stated budget", "TravelAgent", "trip_query"),
        "finance": ("Analyse spending and surface leaks", "FinanceAgent", "user_expenses"),
        "security": ("Assess the supplied link for phishing indicators", "SecurityAgent", "url_input"),
        "document": ("Extract key data from the uploaded document", "DocumentAgent", "uploaded_file"),
    }
    return [
        {"step": i, "task": mapping[d][0], "agent": mapping[d][1], "input_key": mapping[d][2]}
        for i, d in enumerate(_domains(query), start=1)
        if d in mapping
    ]


UNMATCHED_REPORT = (
    "## Outside the scripted demo\n\n"
    "This request does not match any scenario mock mode has fixtures for, so the "
    "specialist output below is **canned finance data and is not an answer to what "
    "you asked**.\n\n"
    "The orchestration itself is real — intent, planning, routing, validation and "
    "synthesis all ran. Only the agent content is scripted.\n\n"
    "Mock mode covers spending analysis, trip planning, and link or document safety. "
    "Set `ANTHROPIC_API_KEY` in `backend/.env` to answer anything else for real.\n"
)


def _response(query: str) -> dict:
    domains = _domains(query)
    security_hit = "security" in domains
    alerts = []
    if security_hit:
        alerts.append(
            {
                "level": "CRITICAL",
                "message": "Phishing link detected — do not open. Block your card if details were entered.",
            }
        )
    if "finance" in domains:
        alerts.append(
            {"level": "HIGH", "message": "₹2,217/month is going to four barely-used subscriptions."}
        )

    finance_score = 68
    security_score = 45 if security_hit else 95
    scores = [finance_score, security_score]
    if "travel" in domains:
        scores.append(TRAVEL["travel_score"])

    matched = matched_scenario(query)
    agents_ran = "\n".join(f"- {step['agent']} — {step['task']}" for step in _plan(query))

    if matched:
        report = (
            "## What LifeOS did\n\n"
            "This run is being served from **scripted fixtures** — no API key is configured, "
            "so the orchestration is real but the agent content is canned.\n\n"
            "Set `ANTHROPIC_API_KEY` (or a Lyzr key) in `backend/.env` and the same pipeline "
            "produces live output with no code change.\n\n"
            "### Agents that ran\n\n" + agents_ran
        )
    else:
        report = UNMATCHED_REPORT + "\n### Agents that ran\n\n" + agents_ran

    return {
        "headline": (
            "LifeOS ran your request through the full agent pipeline and merged the findings."
            if matched
            else "This request is outside the scripted demo — the content below is canned."
        ),
        "unified_report": report,
        "priority_alerts": (alerts or [{"level": "NORMAL", "message": "No urgent items."}])
        if matched
        # Suppressing these matters: an unmatched query must not raise a
        # CRITICAL alert about subscriptions the user never asked about.
        else [{"level": "NORMAL", "message": "No scripted scenario matched this request."}],
        "action_log": [
            {"step": 1, "agent": "IntentAgent", "action": "Classified the request", "status": "SUCCESS"},
            {"step": 2, "agent": "PlannerAgent", "action": "Decomposed into sub-tasks", "status": "SUCCESS"},
            {"step": 3, "agent": "RouterAgent", "action": "Dispatched to specialists", "status": "SUCCESS"},
            {"step": 4, "agent": "CriticAgent", "action": "Validated specialist outputs", "status": "SUCCESS"},
            {"step": 5, "agent": "ResponseAgent", "action": "Synthesised unified report", "status": "SUCCESS"},
        ],
        "dashboard_updates": {
            "finance_score": finance_score,
            "security_score": security_score,
            "life_score": round(sum(scores) / len(scores)),
            # An unmatched query must not seed the Action Center with a
            # reminder about a gym membership it never asked about.
            "reminders": [
                {
                    "id": "r1",
                    "title": "Cancel Gold's Gym membership",
                    "due": "2026-07-31",
                    "priority": "HIGH",
                    "source": "FinanceAgent",
                }
            ]
            if matched and "finance" in domains
            else [],
        },
    }


def completion_for(agent_name: str, user_input: str) -> str:
    """Return a JSON string for the given agent, as an LLM would."""
    domains = _domains(user_input)

    if agent_name == "IntentAgent":
        matched = matched_scenario(user_input)
        return json.dumps(
            {
                "domains": domains,
                "complexity": "multi" if len(domains) > 1 else "single",
                "requires_file": "document" in domains,
                # The existing contract field, finally carrying a real signal:
                # in mock mode it flags a request the fixtures cannot answer.
                "clarification_needed": not matched,
                "clarification_question": None
                if matched
                else (
                    "Demo mode has fixtures for spending analysis, trip planning, and link "
                    "or document safety. Ask about one of those, or configure an API key."
                ),
            }
        )

    if agent_name == "PlannerAgent":
        return json.dumps(_plan(user_input))

    if agent_name == "FinanceAgent":
        return json.dumps(FINANCE)
    if agent_name == "TravelAgent":
        return json.dumps(TRAVEL)
    if agent_name == "SecurityAgent":
        return json.dumps(SECURITY)
    if agent_name == "DocumentAgent":
        return json.dumps(DOCUMENT)

    if agent_name == "CriticAgent":
        return json.dumps(
            {"agent": "unknown", "valid": True, "issues": [], "retry_needed": False, "corrected_output": None}
        )

    if agent_name == "ResponseAgent":
        return json.dumps(_response(user_input))

    return json.dumps({})
