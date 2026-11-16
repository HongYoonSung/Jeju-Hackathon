import logging
from typing import Optional
import httpx
from app.config import settings
from app.providers.route_base import BaseRouter
from app.providers.route_estimate import EstimateRouter
from app.schemas import LatLng, MetricResult, RouteResponse

logger = logging.getLogger(__name__)


class OSRMRouter(BaseRouter):
    def __init__(self):
        self.fallback = EstimateRouter()

    async def route(
        self, origin: LatLng, destination: LatLng, mode: str = "driving"
    ) -> Optional[RouteResponse]:
        base_url = settings.OSRM_BASE_URL.rstrip("/")
        if not base_url:
            return await self.fallback.route(origin, destination, mode)

        url = f"{base_url}/route/v1/driving/{origin.lng},{origin.lat};{destination.lng},{destination.lat}"
        params = {"overview": "full", "geometries": "geojson"}

        try:
            async with httpx.AsyncClient(timeout=settings.ROUTER_TIMEOUT_S) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        dist = int(round(r.get("distance", 0)))
                        dur = int(round(r.get("duration", 0)))
                        raw_coords = r.get("geometry", {}).get("coordinates", [])
                        # OSRM coordinates are [lng, lat] -> convert to [lat, lng] (SPEC 7.3)
                        geometry = [[c[1], c[0]] for c in raw_coords]
                        return RouteResponse(
                            distance_m=dist,
                            duration_s=dur,
                            geometry=geometry,
                            provider="osrm",
                        )
                logger.warning("OSRM route request failed with status %s", resp.status_code)
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
            logger.warning("OSRM route request failed: %s", type(exc).__name__)

        return await self.fallback.route(origin, destination, mode)

    async def metrics(
        self, origin: LatLng, destinations: list[tuple[str, LatLng]]
    ) -> list[MetricResult]:
        if not destinations:
            return []

        base_url = settings.OSRM_BASE_URL.rstrip("/")
        if not base_url:
            return await self.fallback.metrics(origin, destinations)

        coordinates = ";".join(
            [f"{origin.lng},{origin.lat}"]
            + [f"{destination.lng},{destination.lat}" for _, destination in destinations]
        )
        url = f"{base_url}/table/v1/driving/{coordinates}"
        params = {"sources": "0", "annotations": "distance,duration"}

        try:
            async with httpx.AsyncClient(timeout=settings.ROUTER_TIMEOUT_S) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                distances = data.get("distances", [[]])[0]
                durations = data.get("durations", [[]])[0]
                results = []
                for index, (destination_id, destination) in enumerate(destinations):
                    distance = distances[index + 1] if index + 1 < len(distances) else None
                    duration = durations[index + 1] if index + 1 < len(durations) else None
                    if distance is not None and duration is not None:
                        results.append(
                            MetricResult(
                                id=destination_id,
                                distance_m=int(round(distance)),
                                duration_s=int(round(duration)),
                                source="osrm",
                            )
                        )
                    else:
                        fallback = await self.fallback.route(origin, destination)
                        if fallback is not None:
                            results.append(
                                MetricResult(
                                    id=destination_id,
                                    distance_m=fallback.distance_m,
                                    duration_s=fallback.duration_s,
                                    source=fallback.provider,
                                )
                            )
                return results
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            logger.warning("OSRM matrix request failed: %s", type(exc).__name__)
            return await self.fallback.metrics(origin, destinations)
