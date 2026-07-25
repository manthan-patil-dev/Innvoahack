from fastapi import APIRouter

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
    router_ = get_router()
    backend = router_.active_name
    return HealthResponse(
        # "mock" is a working state, not a healthy one — say so honestly.
        status="ok" if backend != "mock" else "degraded",
        backend=backend,
        # Must follow the active backend, not CLAUDE_MODEL.
        model=router_.active_model,
        agents=AGENTS,
    )
