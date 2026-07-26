from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every field has a default, so the server boots with an empty .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Backend selection: auto | lyzr | claude | mock
    llm_backend: str = "auto"

    # Anthropic
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"

    # --- OpenAI-compatible providers -------------------------------------
    # OpenAI, Groq and Gemini all expose the same /chat/completions contract,
    # so one backend class serves all three; only key, base URL and model
    # differ. Any provider left without a key is skipped entirely.
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.3-70b-versatile"

    gemini_api_key: str = ""
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"
    gemini_model: str = "gemini-2.0-flash"

    # Lyzr Studio
    lyzr_api_key: str = ""
    lyzr_base_url: str = "https://agent-prod.studio.lyzr.ai"
    lyzr_user_id: str = "lifeos-demo@example.com"
    lyzr_agent_id_intent: str = ""
    lyzr_agent_id_planner: str = ""
    lyzr_agent_id_finance: str = ""
    lyzr_agent_id_travel: str = ""
    lyzr_agent_id_security: str = ""
    lyzr_agent_id_document: str = ""
    lyzr_agent_id_critic: str = ""
    lyzr_agent_id_response: str = ""

    # Server
    cors_origins: str = "http://localhost:3000,http://localhost:3100,https://innvoahack.vercel.app"
    agent_timeout_seconds: int = 60

    # Vercel gives every preview deployment its own hostname, so an exact-match
    # list goes stale the moment a branch is deployed. Left empty by default —
    # it only matters when the browser calls this API directly. Behind the
    # Next.js proxy the request is server-to-server and CORS never applies.
    # Suggested value, scoped to one project rather than all of vercel.app:
    #   ^https://innvoahack(-[a-z0-9-]+)?\.vercel\.app$
    cors_origin_regex: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        # A browser's Origin header is scheme + host + port and never carries a
        # trailing slash, so "https://app.vercel.app/" matches nothing and every
        # preflight answers 400. One character, total outage, no useful error —
        # normalise it rather than leave the trap set.
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    def openai_compat_providers(self) -> list[tuple[str, str, str, str]]:
        """(name, api_key, base_url, model) for each configured provider.

        Order is the preference order used when LLM_BACKEND=auto. Providers
        with no key are omitted, so an unset provider can never be selected.
        """
        candidates = [
            ("openai", self.openai_api_key, self.openai_base_url, self.openai_model),
            ("groq", self.groq_api_key, self.groq_base_url, self.groq_model),
            ("gemini", self.gemini_api_key, self.gemini_base_url, self.gemini_model),
        ]
        return [c for c in candidates if c[1]]

    def lyzr_agent_id(self, agent_name: str) -> str:
        """LifeOS agent name -> configured Lyzr Studio agent id ('' if unmapped)."""
        key = f"lyzr_agent_id_{agent_name.replace('Agent', '').lower()}"
        return getattr(self, key, "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
