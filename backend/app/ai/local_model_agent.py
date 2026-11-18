"""Adapt the repository's Jeju cart agent to the backend search response."""

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from urllib.parse import quote

from ai.agent_runner import GEMINI_API_KEY, ask_jeju_cart_agent
from app.schemas import (
    ComparisonItemPrice,
    ComparisonStoreSummary,
    ComparisonSummary,
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
        item_prices = {
            str(item.get("query")): int(item.get("final_price") or 0)
            for item in item_details
            if isinstance(item, dict) and item.get("query")
        }
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
                item_prices=item_prices or None,
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
                matched_query=query,
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

def _build_comparison(data: Dict[str, Any], ingredients: List[str]) -> ComparisonSummary:
    options: List[ComparisonStoreSummary] = []

    online_analysis = data.get("online_analysis") or {}
    online_items = [
        ComparisonItemPrice(
            query=str(item.get("query") or ""),
            product_name=str(item.get("title") or item.get("query") or ""),
            price=int(item.get("item_price") or 0),
        )
        for item in (online_analysis.get("items") or [])
    ]
    if online_items or online_analysis.get("final_online_total") is not None:
        options.append(
            ComparisonStoreSummary(
                label="온라인 최저가",
                name="온라인 묶음배송",
                type="online",
                total_price=int(online_analysis.get("final_online_total") or 0),
                shipping_fee=int(online_analysis.get("total_shipping_fee") or 0),
                badge=f"배송비 {int(online_analysis.get('total_shipping_fee') or 0):,}원 포함",
                items=online_items,
            )
        )

    offline_analysis = data.get("offline_analysis") or {}
    for idx, store in enumerate((offline_analysis.get("all_nearby_stores") or [])[:2], start=1):
        store_items = [
            ComparisonItemPrice(
                query=str(item.get("query") or ""),
                product_name=str(item.get("product_name") or item.get("query") or ""),
                price=int(item.get("final_price") or 0),
            )
            for item in (store.get("items") or [])
        ]
        options.append(
            ComparisonStoreSummary(
                label=f"오프라인 매장 {idx}",
                name=str(store.get("store_name") or f"매장 {idx}"),
                type="offline",
                total_price=int(store.get("total_final_price") or 0),
                tamna_discount_total=int(store.get("total_saved_tamna") or 0),
                badge=str(store.get("tamna_badge") or ""),
                items=store_items,
            )
        )

    rec = data.get("recommended_plan") or {}
    return ComparisonSummary(
        ingredients=ingredients,
        best_strategy=rec.get("best_strategy"),
        best_total_cost=rec.get("best_total_cost"),
        max_savings=rec.get("max_savings"),
        options=options,
    )


class LocalModelAgent:
    async def search(self, req: SearchRequest) -> SearchResponse:
        if not GEMINI_API_KEY:
            raise NotImplementedError("GEMINI_API_KEY is not configured")

        model_result = await asyncio.to_thread(ask_jeju_cart_agent, req.query)
        generated_at = datetime.now(KST)
        briefing = model_result.get("agent_briefing")
        parsed_ingredients = (model_result.get("parsed_intent") or {}).get("ingredients") or []
        data = model_result.get("data") or {}
        return SearchResponse(
            request_id=_stable_id("request", f"{req.query}|{generated_at.isoformat()}"),
            query=req.query,
            generated_at=generated_at.isoformat(),
            results=_build_results(data, generated_at),
            agent_briefing=briefing.strip()[:2000]
            if isinstance(briefing, str) and briefing.strip()
            else None,
            comparison=_build_comparison(data, [str(i) for i in parsed_ingredients]),
        )

    async def estimate_crowd(
        self, place_ids: List[str], at: datetime
    ) -> List[CrowdInfo]:
        raise NotImplementedError("AI model not connected")
