from fastapi import APIRouter

from app.config import get_settings
from app.schemas.chat import HealthResponse
from app.services.lyzr_client import get_router

router = APIRouter(tags=["system"])

AGENTS = [
    "IntentAgent",
    "PlannerAgent",
    "RouterAgent",
    "FinanceAgent",
    "TravelAgent",
    "SecurityAgent",
    "DocumentAgent",
    "CriticAgent",
    "ResponseAgent",
]


@router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    backend = get_router().active_name
    return HealthResponse(
        # "mock" is a working state, not a healthy one — say so honestly.
        status="ok" if backend != "mock" else "degraded",
        backend=backend,
        model=settings.claude_model,
        agents=AGENTS,
    )
