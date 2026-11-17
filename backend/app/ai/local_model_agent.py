"""Adapt the repository's Jeju cart agent to the backend search response."""

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from urllib.parse import quote

from ai.agent_runner import GEMINI_API_KEY, ask_jeju_cart_agent
from app.schemas import (
    CrowdInfo,
    OfflinePlace,
    OnlinePlace,
    PlaceResult,
    PriceInfo,
    SearchRequest,
    SearchResponse,
)

logger = logging.getLogger(__name__)
KST = timezone(timedelta(hours=9))


def _stable_id(kind: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
    return f"{kind}_{digest}"


def _checked_at(value: Any, generated_at: datetime) -> str:
    if isinstance(value, str) and len(value) == 10:
        try:
            return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=KST).isoformat()
        except ValueError:
            pass
    return generated_at.isoformat()


def _online_search_url(query: str) -> str:
    return f"https://search.shopping.naver.com/search/all?query={quote(query)}"


def _build_results(data: Dict[str, Any], generated_at: datetime) -> List[PlaceResult]:
    results: List[PlaceResult] = []
    offline_analysis = data.get("offline_analysis") or {}

    for store in offline_analysis.get("all_nearby_stores") or []:
        try:
            store_name = str(store["store_name"]).strip()
            address = str(store["address"]).strip()
            lat, lng = float(store["lat"]), float(store["lng"])
            amount = int(store["total_final_price"])
        except (KeyError, TypeError, ValueError):
            logger.warning("Skipped an offline result with incomplete store data")
            continue

        if not store_name or not address or amount < 0:
            continue
        item_details = store.get("items") or []
        checked_at = next(
            (
                _checked_at(item.get("inspect_day"), generated_at)
                for item in item_details
                if isinstance(item, dict) and item.get("inspect_day")
            ),
            generated_at.isoformat(),
        )
        results.append(
            PlaceResult(
                id=_stable_id("offline", f"{store_name}|{address}"),
                type="offline",
                rank=0,
                name=store_name,
                price=PriceInfo(
                    amount=amount,
                    unit_label="장바구니",
                    checked_at=checked_at,
                ),
                offline=OfflinePlace(address=address, lat=lat, lng=lng),
            )
        )

    online_analysis = data.get("online_analysis") or {}
    for item in online_analysis.get("items") or []:
        try:
            query = str(item["query"]).strip()
            title = str(item.get("title") or query).strip()
            amount = int(item["item_price"])
        except (KeyError, TypeError, ValueError):
            logger.warning("Skipped an online result with incomplete price data")
            continue
        if not query or amount < 0:
            continue
        results.append(
            PlaceResult(
                id=_stable_id("online", f"{query}|{title}"),
                type="online",
                rank=0,
                name=title,
                price=PriceInfo(
                    amount=amount,
                    unit_label=query,
                    checked_at=_checked_at(item.get("indexed_date"), generated_at),
                ),
                online=OnlinePlace(
                    site_name="네이버쇼핑",
                    deeplink_url=_online_search_url(query),
                ),
            )
        )

    results.sort(
        key=lambda result: (
            result.price.amount if result.price else float("inf"),
            result.type != "offline",
        )
    )
    for rank, result in enumerate(results, start=1):
        result.rank = rank
    return results

class LocalModelAgent:
    async def search(self, req: SearchRequest) -> SearchResponse:
        if not GEMINI_API_KEY:
            raise NotImplementedError("GEMINI_API_KEY is not configured")

        model_result = await asyncio.to_thread(ask_jeju_cart_agent, req.query)
        generated_at = datetime.now(KST)
        briefing = model_result.get("agent_briefing")
        return SearchResponse(
            request_id=_stable_id("request", f"{req.query}|{generated_at.isoformat()}"),
            query=req.query,
            generated_at=generated_at.isoformat(),
            results=_build_results(model_result.get("data") or {}, generated_at),
            agent_briefing=briefing.strip()[:2000]
            if isinstance(briefing, str) and briefing.strip()
            else None,
        )

    async def estimate_crowd(
        self, place_ids: List[str], at: datetime
    ) -> List[CrowdInfo]:
        raise NotImplementedError("AI model not connected")
