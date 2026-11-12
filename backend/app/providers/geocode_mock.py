import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.providers.geocode_base import BaseGeocoder
from app.schemas import GeocodeResponse

DATA_PATH = (
    Path(__file__).resolve().parent.parent / "data" / "mock" / "landmarks.json"
)


class MockGeocoder(BaseGeocoder):
    def __init__(self):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            self.landmarks: List[Dict[str, Any]] = json.load(f)

    async def geocode(self, address: str) -> Optional[GeocodeResponse]:
        addr = address.strip()
        if not addr:
            return None

        # landmarks 부분일치 검색
        for lm in self.landmarks:
            if lm["keyword"] in addr or addr in lm["keyword"]:
                return GeocodeResponse(
                    lat=lm["lat"],
                    lng=lm["lng"],
                    label=lm["name"],
                    provider="mock",
                )

        # 없으면 제주시청 좌표 반환 + label에 '(대략)' 표기 (SPEC 8.2)
        return GeocodeResponse(
            lat=33.4996,
            lng=126.5312,
            label=f"{addr} (대략)",
            provider="mock",
        )
