import logging
from typing import Optional
import httpx
from app.config import settings
from app.providers.route_base import BaseRouter
from app.providers.route_estimate import EstimateRouter
from app.schemas import LatLng, RouteResponse

logger = logging.getLogger(__name__)


class NaverRouter(BaseRouter):
    def __init__(self):
        self.fallback = EstimateRouter()
        self.has_keys = bool(settings.NAVER_CLIENT_ID and settings.NAVER_CLIENT_SECRET)
        if not self.has_keys:
            logger.warning("NAVER API keys not provided. Falling back to EstimateRouter.")

    async def route(
        self, origin: LatLng, destination: LatLng, mode: str = "driving"
    ) -> Optional[RouteResponse]:
        if not self.has_keys:
            return await self.fallback.route(origin, destination, mode)

        url = "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving"
        headers = {
            "X-NCP-APIGW-API-KEY-ID": settings.NAVER_CLIENT_ID,
            "X-NCP-APIGW-API-KEY": settings.NAVER_CLIENT_SECRET,
        }
        params = {
            "start": f"{origin.lng},{origin.lat}",
            "goal": f"{destination.lng},{destination.lat}",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    tra_unit = data.get("route", {}).get("traoptimal", [])
                    if tra_unit:
                        unit = tra_unit[0]
                        summary = unit.get("summary", {})
                        dist = summary.get("distance", 0)
                        dur = int(round(summary.get("duration", 0) / 1000.0))
                        raw_path = unit.get("path", [])
                        geometry = [[p[1], p[0]] for p in raw_path]
                        return RouteResponse(
                            distance_m=dist,
                            duration_s=dur,
                            geometry=geometry,
                            provider="naver",
                        )
        except Exception as e:
            logger.error("Naver route calculation failed: %s. Using fallback.", e)

        return await self.fallback.route(origin, destination, mode)
