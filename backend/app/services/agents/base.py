"""
Agent primitive.

Every LifeOS agent is this class plus a system prompt and an output schema.
`run()` handles the part that actually breaks in practice: getting valid JSON
out of an LLM. It extracts, validates against Pydantic, and on failure retries
once with the validation error fed back in — which is the CriticAgent's retry
rule applied at the transport level, before the Critic ever sees the output.
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ValidationError

from app.services.lyzr_client import get_router

logger = logging.getLogger("lifeos.agent")


# --------------------------------------------------------------------------
# JSON extraction
# --------------------------------------------------------------------------


def extract_json(text: str) -> Any:
    """Pull the first complete JSON value out of a model completion.

    Models wrap JSON in prose or ```json fences even when told not to. This
    scans for the first balanced {...} or [...] while respecting string
    literals and escapes, so a brace inside a string can't end the scan early.
    """
    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.rstrip().endswith("```"):
            cleaned = cleaned.rstrip()[:-3]
        cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = next((i for i, c in enumerate(cleaned) if c in "{["), -1)
    if start == -1:
        raise ValueError("no JSON object or array found in completion")

    opener = cleaned[start]
    closer = "}" if opener == "{" else "]"
    depth = 0
    in_string = False
    escaped = False

    for i in range(start, len(cleaned)):
        ch = cleaned[i]
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return json.loads(cleaned[start : i + 1])

    raise ValueError("unterminated JSON in completion")


# --------------------------------------------------------------------------
# Agent
# --------------------------------------------------------------------------


@dataclass
class AgentRun:
    agent: str
    ok: bool
    output: Any = None
    raw: str = ""
    attempts: int = 1
    retried: bool = False
    note: str | None = None
    elapsed_ms: int = 0
    backend: str = "mock"
    error: str | None = None


@dataclass
class Agent:
    name: str
    system_prompt: str
    schema: type[BaseModel] | None = None
    # True when the contract is a JSON array (PlannerAgent, CriticAgent batch).
    expects_list: bool = False
    # Sonnet 4.6 defaults effort to `high`; set it explicitly to keep the
    # on-stage pipeline fast. Classification hops stay low.
    effort: str = "medium"
    max_tokens: int = 4096
    fallback: dict[str, Any] | list[Any] | None = field(default=None)

    async def run(self, user_input: str) -> AgentRun:
        started = time.perf_counter()
        router = get_router()

        prompt = user_input
        last_error: str | None = None
        raw = ""
        backend = "mock"

        for attempt in (1, 2):
            try:
                raw, backend = await router.complete(
                    agent_name=self.name,
                    system_prompt=self.system_prompt,
                    user_input=prompt,
                    effort=self.effort,
                    max_tokens=self.max_tokens,
                )
                parsed = extract_json(raw)
                validated = self._validate(parsed)

                return AgentRun(
                    agent=self.name,
                    ok=True,
                    output=validated,
                    raw=raw,
                    attempts=attempt,
                    retried=attempt > 1,
                    note=(
                        f"First attempt failed validation ({last_error}); retried with "
                        "an explicit schema reminder."
                        if attempt > 1
                        else None
                    ),
                    elapsed_ms=int((time.perf_counter() - started) * 1000),
                    backend=backend,
                )

            except (ValueError, ValidationError, json.JSONDecodeError) as exc:
                last_error = str(exc)[:300]
                logger.warning("%s attempt %d invalid: %s", self.name, attempt, last_error)
                # Feed the failure back in — this is the retry the Critic rule
                # describes, applied before synthesis rather than after.
                prompt = (
                    f"{user_input}\n\n---\n"
                    f"Your previous reply could not be parsed. Error: {last_error}\n"
                    "Reply with ONLY the JSON value described in your instructions. "
                    "No prose, no markdown fences, no trailing commentary."
                )
            except Exception as exc:
                last_error = str(exc)[:300]
                logger.error("%s transport failure: %s", self.name, last_error)
                break

        # Both attempts failed — hand back the declared fallback so the
        # pipeline continues with a degraded-but-valid payload.
        return AgentRun(
            agent=self.name,
            ok=False,
            output=self._validate(self.fallback) if self.fallback is not None else None,
            raw=raw,
            attempts=2,
            retried=True,
            note="Both attempts failed; served the fallback payload.",
            elapsed_ms=int((time.perf_counter() - started) * 1000),
            backend=backend,
            error=last_error,
        )

    def _validate(self, parsed: Any) -> Any:
        if self.schema is None:
            return parsed
        if self.expects_list:
            if not isinstance(parsed, list):
                raise ValueError(f"expected a JSON array, got {type(parsed).__name__}")
            return [self.schema.model_validate(item) for item in parsed]
        if not isinstance(parsed, dict):
            raise ValueError(f"expected a JSON object, got {type(parsed).__name__}")
        return self.schema.model_validate(parsed)
