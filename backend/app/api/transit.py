from fastapi import APIRouter
from app.schemas import (
    TransitRequest,
    TransitResponse,
    TransitOption,
    TransitStep,
)
from app.utils.geo import haversine

router = APIRouter()


@router.post("/transit", response_model=TransitResponse)
async def transit_endpoint(req: TransitRequest):
    # SPEC 7.4 Mock transit response
    dist = haversine(req.origin, req.destination)
    bus_duration = max(300, int(round((dist / 5000.0) * 600)))
    total = 300 + bus_duration + 180

    options = [
        TransitOption(
            total_duration_s=total,
            transfers=0,
            steps=[
                TransitStep(mode="walk", label="도보", duration_s=300),
                TransitStep(mode="bus", label="402번", duration_s=bus_duration),
                TransitStep(mode="walk", label="도보", duration_s=180),
            ],
        )
    ]
    return TransitResponse(options=options, provider="mock")
