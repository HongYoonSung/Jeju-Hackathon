from typing import Optional
import httpx
from app.config import settings
from app.providers.route_base import BaseRouter
from app.providers.route_estimate import EstimateRouter
from app.schemas import LatLng, RouteResponse


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
            async with httpx.AsyncClient(timeout=10.0) as client:
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
        except Exception:
            pass

        return await self.fallback.route(origin, destination, mode)
