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

    # Supabase (reserved — schema step deferred)
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    demo_user_id: str = "00000000-0000-0000-0000-000000000001"

    # Server
    cors_origins: str = "http://localhost:3000"
    agent_timeout_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def lyzr_agent_id(self, agent_name: str) -> str:
        """LifeOS agent name -> configured Lyzr Studio agent id ('' if unmapped)."""
        key = f"lyzr_agent_id_{agent_name.replace('Agent', '').lower()}"
        return getattr(self, key, "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
