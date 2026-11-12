import json
import hashlib
import math
import urllib.parse
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import uuid

from app.schemas import (
    SearchRequest,
    SearchResponse,
    PlaceResult,
    OfflinePlace,
    OnlinePlace,
    PriceInfo,
    CrowdInfo,
)

KST = timezone(timedelta(hours=9))
BASE_DIR = Path(__file__).resolve().parent.parent / "data" / "mock"


def _load_json(file_name: str) -> List[Dict[str, Any]]:
    path = BASE_DIR / file_name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _hour_profile(hour: int) -> float:
    # 11~13시, 17~19시 피크인 종 모양(0.15~1.0)
    # SPEC 8.1
    p1 = math.exp(-((hour - 12.0) ** 2) / 3.0)
    p2 = math.exp(-((hour - 18.0) ** 2) / 3.0)
    peak = max(p1, p2)
    val = 0.15 + 0.85 * peak
    return max(0.15, min(1.0, val))


class MockAgent:
    def __init__(self):
        self.stores = _load_json("stores.json")
        self.online_malls = _load_json("online_malls.json")

    async def search(self, req: SearchRequest) -> SearchResponse:
        query = req.query.strip()
        query_hash = int(hashlib.sha256(query.encode("utf-8")).hexdigest(), 16)
        base_price = 1500 + (query_hash % 4000)
        base_price = round(base_price / 10) * 10

        now_kst = datetime.now(KST)
        checked_at_str = now_kst.strftime("%Y-%m-%dT%H:00:00+09:00")

        items: List[Dict[str, Any]] = []

        # 오프라인 매장들
        for s in self.stores:
            p_val = round((base_price * s.get("price_factor", 1.0)) / 10) * 10
            items.append(
                {
                    "id": s["id"],
                    "type": "offline",
                    "name": s["name"],
                    "price_amount": p_val,
                    "unit_label": "1개",  # SPEC-DEFAULT: unit-label 기본값
                    "checked_at": checked_at_str,
                    "offline": {
                        "address": s["address"],
                        "lat": s["lat"],
                        "lng": s["lng"],
                    },
                    "online": None,
                }
            )

        # 온라인 몰들
        for m in self.online_malls:
            p_val = round((base_price * m.get("price_factor", 1.0)) / 10) * 10
            encoded_q = urllib.parse.quote(query)
            deeplink = m["url_template"].replace("{q}", encoded_q)
            items.append(
                {
                    "id": m["id"],
                    "type": "online",
                    "name": m["name"],
                    "price_amount": p_val,
                    "unit_label": "1개",
                    "checked_at": checked_at_str,
                    "offline": None,
                    "online": {
                        "site_name": m["site_name"],
                        "deeplink_url": deeplink,
                    },
                }
            )

        # rank: 가격 오름차순
        items.sort(key=lambda x: x["price_amount"])

        results: List[PlaceResult] = []
        for idx, it in enumerate(items, start=1):
            price_obj = PriceInfo(
                amount=it["price_amount"],
                unit_label=it["unit_label"],
                checked_at=it["checked_at"],
            )
            offline_obj = OfflinePlace(**it["offline"]) if it["offline"] else None
            online_obj = OnlinePlace(**it["online"]) if it["online"] else None

            results.append(
                PlaceResult(
                    id=it["id"],
                    type=it["type"],
                    rank=idx,
                    name=it["name"],
                    price=price_obj,
                    offline=offline_obj,
                    online=online_obj,
                    crowd=None,  # 6.3 오케스트레이션 규칙에 따라 estimate_crowd에서 채움
                )
            )

        return SearchResponse(
            request_id=str(uuid.uuid4()),
            query=query,
            generated_at=now_kst.isoformat(),
            results=results,
        )

    async def estimate_crowd(
        self, place_ids: List[str], at: datetime
    ) -> List[CrowdInfo]:
        store_map = {s["id"]: s for s in self.stores}
        hour = at.hour
        h_profile = _hour_profile(hour)
        as_of_str = at.strftime("%Y-%m-%dT%H:00:00+09:00")

        res: List[CrowdInfo] = []
        for pid in place_ids:
            s = store_map.get(pid)
            if not s:
                continue
            cap_idx = s.get("capacity_index", 1.0)
            max_p = s.get("max_people", 200)
            ratio = cap_idx * h_profile

            if ratio < 0.25:
                lvl = "low"
            elif ratio < 0.5:
                lvl = "medium"
            elif ratio < 0.75:
                lvl = "high"
            else:
                lvl = "very_high"

            est_people = int(round(ratio * max_p))
            res.append(
                CrowdInfo(
                    level=lvl,
                    estimated_people=est_people,
                    as_of=as_of_str,
                    source="mock",
                )
            )
        return res
