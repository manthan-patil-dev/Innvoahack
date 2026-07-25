import logging

from fastapi import APIRouter, HTTPException

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.orchestrator import lifecore

logger = logging.getLogger("lifeos.api")

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Run one request through the full LifeCore pipeline."""
    try:
        return await lifecore.run(request)
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the client
        logger.exception("LifeCore run failed")
        raise HTTPException(status_code=500, detail=f"LifeCore run failed: {exc}") from exc
