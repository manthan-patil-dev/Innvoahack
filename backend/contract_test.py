"""Assert the /api/chat wire shape matches frontend/lib/types/agents.ts. Dev only."""

import json
import sys
import urllib.request

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/chat",
    data=json.dumps(
        {"message": "Summarize this electricity bill and check if https://evil-bank.in is safe."}
    ).encode(),
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(req, timeout=120) as r:
    d = json.loads(r.read())

fails: list[str] = []


def need(cond: bool, msg: str) -> None:
    if not cond:
        fails.append(msg)


# RunState / Scenario envelope
need(set(d["intent"]) == {
    "domains", "complexity", "requires_file", "clarification_needed", "clarification_question"
}, f"IntentOutput keys: {sorted(d['intent'])}")

need(set(d["plan"][0]) == {"step", "task", "agent", "input_key"}, f"PlanStep keys: {sorted(d['plan'][0])}")

node = d["nodes"][0]
need("elapsedMs" in node, "PipelineNode must use camelCase elapsedMs (frontend reads node.elapsedMs)")
need({"step", "agent", "label", "status", "attempts"} <= set(node), f"PipelineNode keys: {sorted(node)}")
need(node["status"] in {"pending", "running", "success", "failed"}, f"bad node status {node['status']}")

need(set(d["critic"][0]) == {"agent", "valid", "issues", "retry_needed", "corrected_output"},
     f"CriticVerdict keys: {sorted(d['critic'][0])}")

r0 = d["results"][0]
need(set(r0) == {"agent", "output"}, f"AgentResult keys: {sorted(r0)}")
need(r0["agent"] in {"FinanceAgent", "TravelAgent", "SecurityAgent", "DocumentAgent"},
     f"AgentResult.agent not a specialist: {r0['agent']}")

resp = d["response"]
need(set(resp) == {"headline", "unified_report", "priority_alerts", "action_log", "dashboard_updates"},
     f"ResponseOutput keys: {sorted(resp)}")
need(set(resp["dashboard_updates"]) == {"finance_score", "security_score", "life_score", "reminders"},
     f"DashboardUpdates keys: {sorted(resp['dashboard_updates'])}")
need(set(resp["action_log"][0]) == {"step", "agent", "action", "status"},
     f"ActionLogEntry keys: {sorted(resp['action_log'][0])}")
need(resp["action_log"][0]["status"] in {"SUCCESS", "RETRY", "FAILED"}, "bad action_log status")
need(set(resp["priority_alerts"][0]) == {"level", "message"},
     f"PriorityAlert keys: {sorted(resp['priority_alerts'][0])}")

# Specialist payload shapes
by_agent = {r["agent"]: r["output"] for r in d["results"]}
if "SecurityAgent" in by_agent:
    need(set(by_agent["SecurityAgent"]) == {
        "input_type", "risk_score", "risk_level", "threat_type", "explanation",
        "red_flags", "recommendation", "safe_alternative"
    }, f"SecurityOutput keys: {sorted(by_agent['SecurityAgent'])}")
if "DocumentAgent" in by_agent:
    need(set(by_agent["DocumentAgent"]) == {
        "document_type", "summary", "key_information", "expiry_dates",
        "action_items", "importance_level"
    }, f"DocumentOutput keys: {sorted(by_agent['DocumentAgent'])}")

# Spec-required response fields
for field in ("intent", "selected_agents", "results", "response"):
    need(field in d, f"missing spec-required field: {field}")

print(f"agents dispatched : {d['selected_agents']}")
print(f"payload shapes    : {[r['agent'] for r in d['results']]}")
print(f"nodes             : {len(d['nodes'])}")
for f in fails:
    print(f"  FAIL: {f}")
print()
print("CONTRACT OK" if not fails else f"CONTRACT MISMATCH ({len(fails)})")
sys.exit(1 if fails else 0)
