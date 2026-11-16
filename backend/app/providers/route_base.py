from abc import ABC, abstractmethod
from typing import Optional
from app.schemas import LatLng, MetricResult, RouteResponse


class BaseRouter(ABC):
    @abstractmethod
    async def route(
        self, origin: LatLng, destination: LatLng, mode: str = "driving"
    ) -> Optional[RouteResponse]:
        pass

    async def metrics(
        self, origin: LatLng, destinations: list[tuple[str, LatLng]]
    ) -> list[MetricResult]:
        results: list[MetricResult] = []
        for destination_id, destination in destinations:
            route_result = await self.route(origin, destination)
            if route_result is not None:
                results.append(
                    MetricResult(
                        id=destination_id,
                        distance_m=route_result.distance_m,
                        duration_s=route_result.duration_s,
                        source=route_result.provider,
                    )
                )
        return results
