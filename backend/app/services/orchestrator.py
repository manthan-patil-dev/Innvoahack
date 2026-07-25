"""
LifeCore — the central orchestrator.

Every request walks exactly one path and nothing bypasses it:

    User -> Intent -> Planner -> Router -> [Specialists in parallel]
                                              -> Critic (per output, 1 retry)
                                                    -> Response

The Critic is deliberately NOT something the Planner can schedule. LifeCore
invokes it after each specialist, which is what keeps the retry loop a property
of the engine rather than something the model has to remember to ask for.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid

from app.schemas.chat import (
    ActionLogEntry,
    AgentResult,
    ChatRequest,
    ChatResponse,
    CriticVerdict,
    IntentOutput,
    PipelineNode,
    PlanStep,
    ResponseOutput,
)
from app.services.agents import (
    critic_agent,
    document_agent,
    finance_agent,
    intent_agent,
    planner_agent,
    response_agent,
    security_agent,
    travel_agent,
)
from app.services.agents.base import AgentRun
from app.services.lyzr_client import get_router

logger = logging.getLogger("lifeos.core")

SPECIALISTS = {
    "FinanceAgent": finance_agent,
    "TravelAgent": travel_agent,
    "SecurityAgent": security_agent,
    "DocumentAgent": document_agent,
}


def _specialist_input(agent_name: str, task: str, req: ChatRequest) -> str:
    if agent_name == "FinanceAgent":
        return finance_agent.build_input(task, req.message, req.expenses)
    if agent_name == "TravelAgent":
        return travel_agent.build_input(task, req.message)
    if agent_name == "SecurityAgent":
        return security_agent.build_input(task, req.message)
    if agent_name == "DocumentAgent":
        return document_agent.build_input(task, req.message, req.document_text)
    raise ValueError(f"Unknown specialist: {agent_name}")


def _node(step: int, run: AgentRun, label: str) -> PipelineNode:
    return PipelineNode(
        step=step,
        agent=run.agent,
        label=label,
        status="success" if run.ok else "failed",
        elapsedMs=run.elapsed_ms,
        attempts=run.attempts,
        retried=run.retried,
        note=run.note,
    )


class LifeCore:
    """The orchestrator. One public method."""

    async def run(self, req: ChatRequest) -> ChatResponse:
        started = time.perf_counter()
        session_id = req.session_id or f"sesn_{uuid.uuid4().hex[:12]}"
        nodes: list[PipelineNode] = []
        step = 0

        # --- 1. Intent ----------------------------------------------------
        step += 1
        intent_run = await intent_agent.agent.run(
            intent_agent.build_input(req.message, bool(req.document_text))
        )
        intent: IntentOutput = intent_run.output or IntentOutput()
        nodes.append(
            _node(step, intent_run, f"Classified as {', '.join(intent.domains)} ({intent.complexity})")
        )

        # --- 2. Planner ---------------------------------------------------
        step += 1
        plan_run = await planner_agent.agent.run(
            planner_agent.build_input(req.message, intent.model_dump_json())
        )
        plan: list[PlanStep] = plan_run.output or []
        plan = self._sanitise_plan(plan, intent)
        nodes.append(
            _node(step, plan_run, f"Broke the request into {len(plan)} sub-task(s)")
        )

        # --- 3. Router ----------------------------------------------------
        step += 1
        selected = [s.agent for s in plan]
        router_started = time.perf_counter()
        nodes.append(
            PipelineNode(
                step=step,
                agent="RouterAgent",
                label=f"Dispatched to {', '.join(selected) or 'no specialists'}",
                status="success",
                elapsedMs=int((time.perf_counter() - router_started) * 1000),
            )
        )

        # --- 4. Specialists, in parallel ----------------------------------
        specialist_runs: list[AgentRun] = await asyncio.gather(
            *(
                SPECIALISTS[s.agent].agent.run(_specialist_input(s.agent, s.task, req))
                for s in plan
            )
        )

        # --- 5. Critic per output, with at most one retry ------------------
        results: list[AgentResult] = []
        verdicts: list[CriticVerdict] = []

        for plan_step, run in zip(plan, specialist_runs):
            run, verdict = await self._critique_and_maybe_retry(plan_step, run, req)

            step += 1
            nodes.append(_node(step, run, plan_step.task))

            if run.output is not None:
                results.append(
                    AgentResult(agent=plan_step.agent, output=run.output.model_dump())
                )
            verdicts.append(verdict)

        step += 1
        retry_count = sum(1 for n in nodes if n.retried and n.agent in SPECIALISTS)
        nodes.append(
            PipelineNode(
                step=step,
                agent="CriticAgent",
                label=(
                    f"Validated {len(verdicts)} output(s), "
                    f"{retry_count} {'retry' if retry_count == 1 else 'retries'}"
                ),
                status="success",
                elapsedMs=0,
                attempts=1,
            )
        )

        # --- 6. Response --------------------------------------------------
        step += 1
        payloads = json.dumps(
            [{"agent": r.agent, "output": r.output} for r in results], ensure_ascii=False
        )
        trace = json.dumps(
            [
                {
                    "step": n.step,
                    "agent": n.agent,
                    "action": n.label,
                    "status": "RETRY" if n.retried else ("SUCCESS" if n.status == "success" else "FAILED"),
                }
                for n in nodes
            ],
            ensure_ascii=False,
        )
        response_run = await response_agent.agent.run(
            response_agent.build_input(req.message, payloads, trace)
        )
        final: ResponseOutput = response_run.output or response_agent.agent.fallback  # type: ignore[assignment]
        if not isinstance(final, ResponseOutput):
            final = ResponseOutput.model_validate(final)
        nodes.append(_node(step, response_run, "Synthesised one unified report"))

        # The action log is the audit trail — rebuild it from what actually
        # happened rather than trusting the model to transcribe the trace.
        final.action_log = [
            ActionLogEntry(
                step=n.step,
                agent=n.agent,
                action=n.label,
                status="RETRY" if n.retried else ("SUCCESS" if n.status == "success" else "FAILED"),
            )
            for n in nodes
        ]

        logger.info(
            "LifeCore run %s complete in %dms (%d agents)",
            session_id,
            int((time.perf_counter() - started) * 1000),
            len(results),
        )

        # Report who actually served this run, not who was configured to.
        # active_name is derived from config, so a provider that 401s on every
        # call would still be reported as live while fixtures did the work.
        served = [
            r.backend for r in (intent_run, plan_run, *specialist_runs, response_run) if r
        ]
        served_by = (
            served[0]
            if served and all(b == served[0] for b in served)
            else "+".join(sorted(set(served))) or get_router().active_name
        )

        return ChatResponse(
            session_id=session_id,
            query=req.message,
            backend=served_by,
            intent=intent,
            selected_agents=selected,
            results=results,
            response=final,
            plan=plan,
            nodes=nodes,
            critic=verdicts,
        )

    # ----------------------------------------------------------------------

    def _sanitise_plan(self, plan: list[PlanStep], intent: IntentOutput) -> list[PlanStep]:
        """Enforce the routing rules the Planner is told about but may violate.

        Drops non-specialist agents (the Planner sometimes schedules the Critic
        despite the instruction), de-duplicates, caps at 5, and guarantees at
        least one step so the pipeline always has something to run.
        """
        seen: set[str] = set()
        cleaned: list[PlanStep] = []

        for candidate in plan:
            if candidate.agent not in SPECIALISTS or candidate.agent in seen:
                continue
            seen.add(candidate.agent)
            cleaned.append(candidate)
            if len(cleaned) == 5:
                break

        if not cleaned:
            by_domain = {
                "finance": "FinanceAgent",
                "travel": "TravelAgent",
                "security": "SecurityAgent",
                "document": "DocumentAgent",
            }
            fallback_agent = next(
                (by_domain[d] for d in intent.domains if d in by_domain), "FinanceAgent"
            )
            cleaned = [
                PlanStep(
                    step=1,
                    task="Handle the user request end to end",
                    agent=fallback_agent,  # type: ignore[arg-type]
                    input_key="user_query",
                )
            ]

        for index, entry in enumerate(cleaned, start=1):
            entry.step = index
        return cleaned

    async def _critique_and_maybe_retry(
        self, plan_step: PlanStep, run: AgentRun, req: ChatRequest
    ) -> tuple[AgentRun, CriticVerdict]:
        """Validate one specialist output; re-run it once if the Critic objects."""
        if run.output is None:
            return run, CriticVerdict(
                agent=plan_step.agent,
                valid=False,
                issues=[run.error or "Agent produced no output"],
                retry_needed=False,
            )

        critic_run = await critic_agent.agent.run(
            critic_agent.build_input(
                plan_step.agent, run.output.model_dump_json(), req.message
            )
        )
        verdict: CriticVerdict = critic_run.output or CriticVerdict(agent=plan_step.agent)
        verdict.agent = plan_step.agent

        if verdict.valid and not verdict.retry_needed:
            return run, verdict

        # One retry, with the Critic's specific objections fed back in.
        issues = "; ".join(verdict.issues) or "output failed validation"
        retry_input = (
            f"{_specialist_input(plan_step.agent, plan_step.task, req)}\n\n---\n"
            f"Your previous output was rejected by the CriticAgent for these reasons: {issues}\n"
            "Produce a corrected version that resolves every issue listed. "
            "Re-check any arithmetic and any stated budget or constraint."
        )
        retried = await SPECIALISTS[plan_step.agent].agent.run(retry_input)

        if retried.output is not None:
            retried.retried = True
            retried.attempts = run.attempts + retried.attempts
            retried.note = f"CriticAgent rejected the first pass: {issues}"
            return retried, verdict

        return run, verdict


lifecore = LifeCore()
