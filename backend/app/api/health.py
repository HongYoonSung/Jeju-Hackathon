from fastapi import APIRouter
from app.config import settings
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        ai_backend=settings.AI_BACKEND,
        geocoder=settings.GEOCODER,
        router=settings.ROUTER,
    )
