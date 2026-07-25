"""End-to-end smoke test against the running server. Not shipped — dev only."""

import json
import sys
import urllib.request

BASE = "http://127.0.0.1:8000"

SCENARIOS = [
    "Plan my Goa trip under 25000 rupees.",
    "Analyze my spending this month.",
    "Summarize this electricity bill and check if https://hdfcbank-secure-verify.in/login is safe.",
]


def post(path: str, payload: dict) -> dict:
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def get(path: str) -> dict:
    with urllib.request.urlopen(BASE + path, timeout=30) as resp:
        return json.loads(resp.read())


def main() -> int:
    failures = 0

    health = get("/api/health")
    print(f"health      : status={health['status']} backend={health['backend']} agents={len(health['agents'])}")
    if len(health["agents"]) != 9:
        print("  FAIL: expected 9 agents")
        failures += 1

    for query in SCENARIOS:
        data = post("/api/chat", {"message": query})
        required = ["intent", "selected_agents", "results", "response", "plan", "nodes", "critic"]
        missing = [k for k in required if k not in data]
        resp = data.get("response", {})

        print()
        print(f"query       : {query[:62]}")
        print(f"  backend   : {data.get('backend')}")
        print(f"  domains   : {data['intent']['domains']}")
        print(f"  agents    : {data['selected_agents']}")
        print(f"  results   : {[r['agent'] for r in data['results']]}")
        print(f"  nodes     : {len(data['nodes'])}  action_log: {len(resp.get('action_log', []))}")
        print(f"  headline  : {resp.get('headline', '')[:66]}")
        print(f"  alerts    : {len(resp.get('priority_alerts', []))}  life_score: "
              f"{resp.get('dashboard_updates', {}).get('life_score')}")

        if missing:
            print(f"  FAIL: missing response fields {missing}")
            failures += 1
        if not data["results"]:
            print("  FAIL: no specialist results")
            failures += 1
        if not resp.get("unified_report"):
            print("  FAIL: empty unified_report")
            failures += 1
        # The Critic must never appear as a planned/dispatched specialist.
        if "CriticAgent" in data["selected_agents"]:
            print("  FAIL: CriticAgent was dispatched as a specialist")
            failures += 1

    print()
    print("PASS" if failures == 0 else f"FAIL ({failures} problem(s))")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
