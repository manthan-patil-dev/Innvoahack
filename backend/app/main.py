import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import chat, health
from app.services.lyzr_client import get_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("lifeos")


@asynccontextmanager
async def lifespan(app: FastAPI):
    backend = get_router()
    # active_model, not settings.claude_model: quoting CLAUDE_MODEL while
    # serving Groq put a model name in the log that never ran.
    logger.info("LifeCore online — backend=%s model=%s", backend.active_name, backend.active_model)
    if backend.active_name == "mock":
        logger.warning(
            "No LLM provider key configured (LYZR / ANTHROPIC / OPENAI / GROQ / GEMINI). "
            "Running on scripted fixtures — orchestration is real, agent content is canned."
        )
    yield
    await backend.aclose()


app = FastAPI(
    title="LifeOS AI — LifeCore",
    description="Multi-agent orchestrator. One request, nine agents, one unified answer.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    # Optional, and only consulted for a direct browser call. A preflight whose
    # Origin matches neither the list nor this pattern is answered 400, which is
    # exactly what a misconfigured CORS_ORIGINS looks like in the logs.
    allow_origin_regex=get_settings().cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"service": "lifeos-core", "docs": "/docs", "health": "/api/health"}
