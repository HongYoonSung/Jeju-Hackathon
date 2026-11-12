from fastapi import APIRouter, status
from app.errors import AppError
from app.providers import get_geocoder
from app.schemas import GeocodeRequest, GeocodeResponse

router = APIRouter()


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_endpoint(req: GeocodeRequest):
    geocoder = get_geocoder()
    result = await geocoder.geocode(req.address)
    if not result:
        raise AppError(
            status.HTTP_404_NOT_FOUND,
            "GEOCODE_NOT_FOUND",
            "주소를 찾지 못했어요. 더 자세히 입력해 주세요.",
        )
    return result
