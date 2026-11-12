import logging
from typing import Optional
import httpx
from app.config import settings
from app.providers.geocode_base import BaseGeocoder
from app.providers.geocode_mock import MockGeocoder
from app.schemas import GeocodeResponse

logger = logging.getLogger(__name__)


class NaverGeocoder(BaseGeocoder):
    def __init__(self):
        self.mock_fallback = MockGeocoder()
        self.has_keys = bool(settings.NAVER_CLIENT_ID and settings.NAVER_CLIENT_SECRET)
        if not self.has_keys:
            logger.warning("NAVER API keys not provided. Falling back to MockGeocoder.")

    async def geocode(self, address: str) -> Optional[GeocodeResponse]:
        if not self.has_keys:
            return await self.mock_fallback.geocode(address)

        url = "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode"
        headers = {
            "X-NCP-APIGW-API-KEY-ID": settings.NAVER_CLIENT_ID,
            "X-NCP-APIGW-API-KEY": settings.NAVER_CLIENT_SECRET,
        }
        params = {"query": address}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    addresses = data.get("addresses", [])
                    if addresses:
                        item = addresses[0]
                        return GeocodeResponse(
                            lat=float(item["y"]),
                            lng=float(item["x"]),
                            label=item.get("roadAddress") or item.get("jibunAddress") or address,
                            provider="naver",
                        )
        except Exception as e:
            logger.error("Naver geocode failed: %s. Using fallback.", e)

        return await self.mock_fallback.geocode(address)
