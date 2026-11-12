from fastapi import APIRouter, status
from app.errors import AppError
from app.providers import get_router
from app.schemas import RouteRequest, RouteResponse

router = APIRouter()


@router.post("/route", response_model=RouteResponse)
async def route_endpoint(req: RouteRequest):
    router_service = get_router()
    result = await router_service.route(req.origin, req.destination, req.mode)
    if not result:
        raise AppError(
            status.HTTP_502_BAD_GATEWAY,
            "UPSTREAM_ERROR",
            "경로를 계산하지 못했어요.",
        )
    return result
