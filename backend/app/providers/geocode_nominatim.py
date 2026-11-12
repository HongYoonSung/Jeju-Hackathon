import asyncio
import time
from typing import Optional
import httpx
from app.providers.geocode_base import BaseGeocoder
from app.schemas import GeocodeResponse


class NominatimGeocoder(BaseGeocoder):
    def __init__(self):
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    async def geocode(self, address: str) -> Optional[GeocodeResponse]:
        addr = address.strip()
        if not addr:
            return None

        async with self._lock:
            elapsed = time.time() - self._last_call
            if elapsed < 1.0:
                await asyncio.sleep(1.0 - elapsed)
            self._last_call = time.time()

            url = "https://nominatim.openstreetmap.org/search"
            headers = {"User-Agent": "JejuEolmakkwa/1.0 (contact@jeju-hackathon.local)"}
            params = {
                "format": "json",
                "q": addr,
                "countrycodes": "kr",
                "limit": 1,
            }

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(url, params=params, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data and len(data) > 0:
                            item = data[0]
                            return GeocodeResponse(
                                lat=float(item["lat"]),
                                lng=float(item["lon"]),
                                label=item.get("display_name", addr),
                                provider="nominatim",
                            )
            except Exception:
                return None
        return None
