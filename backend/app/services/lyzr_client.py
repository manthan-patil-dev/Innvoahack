"""
LLM backend abstraction — the isolation layer for Lyzr.

Everything uncertain about Lyzr lives behind `LLMBackend.complete()`. The
orchestrator and every agent only ever see that one method, so if the Lyzr
Studio contract differs from what is coded here, exactly one class changes and
nothing else in the codebase moves.

Three backends, tried in order by the resolver:

    LyzrStudioBackend  -> Lyzr Studio inference API (per-agent agent_id)
    ClaudeBackend      -> Anthropic Messages API directly
    MockBackend        -> scripted fixtures, no network

`complete()` degrades down that chain on failure, so a bad Lyzr key or a dead
network downgrades the demo instead of killing it.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Protocol

import httpx

from app.config import get_settings

logger = logging.getLogger("lifeos.backend")


class BackendError(RuntimeError):
    pass


class LLMBackend(Protocol):
    name: str

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> str: ...


# --------------------------------------------------------------------------
# Lyzr Studio
# --------------------------------------------------------------------------


class LyzrStudioBackend:
    """Calls a Lyzr Studio agent by id.

    Lyzr's hosted inference endpoint takes an api key header plus a body of
    {user_id, agent_id, session_id, message}. The system prompt lives on the
    Studio agent itself, so we prepend it to the message here to keep the
    LifeOS prompts authoritative regardless of how the Studio agent is set up.

    If the deployed contract differs, this class is the only thing to fix.
    """

    name = "lyzr"

    def __init__(self) -> None:
        self.settings = get_settings()
        self._client = httpx.AsyncClient(
            base_url=self.settings.lyzr_base_url,
            timeout=self.settings.agent_timeout_seconds,
            headers={
                "x-api-key": self.settings.lyzr_api_key,
                "Content-Type": "application/json",
            },
        )

    def supports(self, agent_name: str) -> bool:
        return bool(self.settings.lyzr_api_key and self.settings.lyzr_agent_id(agent_name))

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> str:
        agent_id = self.settings.lyzr_agent_id(agent_name)
        if not agent_id:
            raise BackendError(f"No Lyzr agent id configured for {agent_name}")

        payload = {
            "user_id": self.settings.lyzr_user_id,
            "agent_id": agent_id,
            "session_id": f"lifeos-{agent_name}",
            "message": f"{system_prompt}\n\n---\n\n{user_input}",
        }

        resp = await self._client.post("/v3/inference/chat/", json=payload)
        resp.raise_for_status()
        data = resp.json()

        # Lyzr has used a few response key names across versions; accept any.
        for key in ("response", "answer", "message", "output", "result"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value
        raise BackendError(f"Unrecognised Lyzr response shape: {list(data)[:6]}")

    async def aclose(self) -> None:
        await self._client.aclose()


# --------------------------------------------------------------------------
# Anthropic direct
# --------------------------------------------------------------------------


class ClaudeBackend:
    """Direct Anthropic Messages API. The reliable path.

    Thinking is left off deliberately: on claude-sonnet-4-6 omitting the
    `thinking` field means no thinking, which is what we want for a live demo
    where latency is visible. Effort is set explicitly per agent because
    Sonnet 4.6 otherwise defaults to `high`.
    """

    name = "claude"

    def __init__(self) -> None:
        from anthropic import AsyncAnthropic

        self.settings = get_settings()
        self._client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> str:
        message = await self._client.messages.create(
            model=self.settings.claude_model,
            max_tokens=max_tokens,
            system=system_prompt,
            output_config={"effort": effort},
            messages=[{"role": "user", "content": user_input}],
        )

        if message.stop_reason == "refusal":
            raise BackendError(f"{agent_name}: model declined the request")

        text = "".join(b.text for b in message.content if b.type == "text")
        if not text.strip():
            raise BackendError(f"{agent_name}: empty completion")
        return text

    async def aclose(self) -> None:
        await self._client.close()


# --------------------------------------------------------------------------
# OpenAI-compatible (OpenAI, Groq, Gemini)
# --------------------------------------------------------------------------


class OpenAICompatBackend:
    """Any provider speaking OpenAI's /chat/completions contract.

    OpenAI, Groq and Gemini all expose that endpoint, so one class covers all
    three and only the key, base URL and model differ. Built on httpx rather
    than a vendor SDK because httpx is already a dependency — adding these
    providers costs no new install.

    `response_format={"type": "json_object"}` is deliberately NOT sent. The
    PlannerAgent's contract is a JSON *array*, and json_object mode requires a
    top-level object, so enabling it would break that agent. extract_json in
    agents/base.py already recovers JSON from fenced or prose-wrapped output.
    """

    def __init__(self, name: str, api_key: str, base_url: str, model: str) -> None:
        self.name = name
        self.model = model
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=get_settings().agent_timeout_seconds,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> str:
        # `effort` has no equivalent here; it is Anthropic-specific and ignored.
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": 0,  # these agents emit JSON, not prose
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input},
            ],
        }

        resp = await self._client.post("/chat/completions", json=payload)
        if resp.status_code >= 400:
            # Surface the provider's own message; it names bad models and bad
            # keys precisely. The key itself lives in a header, never the body.
            raise BackendError(f"{self.name} {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            raise BackendError(f"{agent_name}: no choices in {self.name} response")

        text = (choices[0].get("message") or {}).get("content") or ""
        if not text.strip():
            raise BackendError(f"{agent_name}: empty completion from {self.name}")
        return text

    async def aclose(self) -> None:
        await self._client.aclose()


# --------------------------------------------------------------------------
# Mock
# --------------------------------------------------------------------------


class MockBackend:
    """Serves scripted fixtures. Never touches the network, never fails."""

    name = "mock"

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> str:
        from app.services import mocks

        await asyncio.sleep(0.25)  # keeps the pipeline trace legible on stage
        return mocks.completion_for(agent_name, user_input)

    async def aclose(self) -> None:
        return None


# --------------------------------------------------------------------------
# Resolver
# --------------------------------------------------------------------------


class BackendRouter:
    """Picks a backend per call and degrades on failure.

    The degradation chain is the demo's insurance policy: a Lyzr outage falls
    through to Claude, and an Anthropic outage falls through to fixtures. The
    pipeline always produces a complete, well-formed answer.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.mode = settings.llm_backend.lower()
        self.lyzr: LyzrStudioBackend | None = None
        self.claude: ClaudeBackend | None = None
        self.compat: list[OpenAICompatBackend] = []
        self.mock = MockBackend()

        if self.mode in ("auto", "lyzr") and settings.lyzr_api_key:
            try:
                self.lyzr = LyzrStudioBackend()
            except Exception as exc:  # pragma: no cover - construction guard
                logger.warning("Lyzr backend unavailable: %s", exc)

        if self.mode in ("auto", "lyzr", "claude") and settings.anthropic_api_key:
            try:
                self.claude = ClaudeBackend()
            except Exception as exc:  # pragma: no cover - construction guard
                logger.warning("Claude backend unavailable: %s", exc)

        # openai | groq | gemini — each included only if it has a key, and
        # under a forced mode only the named one is built.
        for name, key, base_url, model in settings.openai_compat_providers():
            if self.mode not in ("auto", name):
                continue
            try:
                self.compat.append(OpenAICompatBackend(name, key, base_url, model))
            except Exception as exc:  # pragma: no cover - construction guard
                logger.warning("%s backend unavailable: %s", name, exc)

    @property
    def active_name(self) -> str:
        if self.mode == "mock":
            return "mock"
        if self.lyzr:
            return "lyzr"
        if self.claude:
            return "claude"
        if self.compat:
            return self.compat[0].name
        return "mock"

    @property
    def active_model(self) -> str:
        """Model id of whichever backend leads the chain.

        Reported by /api/health, so it must track the active backend — quoting
        CLAUDE_MODEL while serving OpenAI would put a false model name on screen.
        """
        if self.mode == "mock":
            return "scripted-fixtures"
        if self.lyzr:
            return "lyzr-studio"
        if self.claude:
            return get_settings().claude_model
        if self.compat:
            return self.compat[0].model
        return "scripted-fixtures"

    def _chain(self, agent_name: str) -> list[LLMBackend]:
        if self.mode == "mock":
            return [self.mock]
        chain: list[LLMBackend] = []
        if self.lyzr and self.lyzr.supports(agent_name):
            chain.append(self.lyzr)
        if self.claude:
            chain.append(self.claude)
        chain.extend(self.compat)
        # Fixtures stay last so a provider outage degrades the demo instead of
        # ending it. Force LLM_BACKEND=mock to serve fixtures exclusively.
        chain.append(self.mock)
        return chain

    async def complete(
        self,
        *,
        agent_name: str,
        system_prompt: str,
        user_input: str,
        effort: str = "medium",
        max_tokens: int = 4096,
    ) -> tuple[str, str]:
        """Returns (completion_text, backend_name_that_served_it)."""
        last: Exception | None = None
        for backend in self._chain(agent_name):
            try:
                text = await asyncio.wait_for(
                    backend.complete(
                        agent_name=agent_name,
                        system_prompt=system_prompt,
                        user_input=user_input,
                        effort=effort,
                        max_tokens=max_tokens,
                    ),
                    timeout=get_settings().agent_timeout_seconds,
                )
                return text, backend.name
            except Exception as exc:
                last = exc
                logger.warning("%s via %s failed: %s", agent_name, backend.name, exc)
        raise BackendError(f"All backends failed for {agent_name}: {last}")

    async def aclose(self) -> None:
        for backend in (self.lyzr, self.claude, *self.compat, self.mock):
            if backend is not None:
                await backend.aclose()


_router: BackendRouter | None = None


def get_router() -> BackendRouter:
    global _router
    if _router is None:
        _router = BackendRouter()
    return _router
