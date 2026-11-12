from typing import Optional
from app.providers.route_base import BaseRouter
from app.schemas import LatLng, RouteResponse
from app.utils.geo import haversine


class EstimateRouter(BaseRouter):
    async def route(
        self, origin: LatLng, destination: LatLng, mode: str = "driving"
    ) -> Optional[RouteResponse]:
        straight_m = haversine(origin, destination)
        distance_m = int(round(straight_m * 1.3))

        # 평균 시속 30km/h = 30,000m / 3,600s = 8.333 m/s
        speed_mps = 30000.0 / 3600.0
        duration_s = max(60, int(round(distance_m / speed_mps)))

        geometry = [
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
        ]

        return RouteResponse(
            distance_m=distance_m,
            duration_s=duration_s,
            geometry=geometry,
            provider="estimate",
        )
