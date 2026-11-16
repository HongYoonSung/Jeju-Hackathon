import asyncio
import logging
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse
from fastapi import APIRouter, status
from app.config import settings
from app.errors import AppError
from app.schemas import LatLng, SearchRequest, SearchResponse, PlaceResult
from app.ai.registry import get_ai_agent
from app.providers import get_router

logger = logging.getLogger(__name__)
router = APIRouter()
KST = timezone(timedelta(hours=9))

JEJU_LAT_MIN = 33.1
JEJU_LAT_MAX = 33.65
JEJU_LNG_MIN = 126.1
JEJU_LNG_MAX = 127.0


def _is_valid_jeju_coord(lat: float, lng: float) -> bool:
    return JEJU_LAT_MIN <= lat <= JEJU_LAT_MAX and JEJU_LNG_MIN <= lng <= JEJU_LNG_MAX


def _is_valid_deeplink(url_str: str, allowed_hosts: list[str]) -> bool:
    try:
        parsed = urlparse(url_str)
        if parsed.scheme != "https":
            return False
        host = (parsed.hostname or "").lower()
        return any(host == ah or host.endswith("." + ah) for ah in allowed_hosts)
    except Exception:
        return False


@router.post("/search", response_model=SearchResponse)
async def search_endpoint(req: SearchRequest):
    agent = get_ai_agent()

    try:
        # 타임아웃 AI_TIMEOUT_S 적용 (SPEC 6.3)
        res: SearchResponse = await asyncio.wait_for(
            agent.search(req), timeout=settings.AI_TIMEOUT_S
        )
    except asyncio.TimeoutError:
        raise AppError(status.HTTP_504_GATEWAY_TIMEOUT, "AI_TIMEOUT", "AI 응답 시간이 초과되었습니다.")
    except NotImplementedError:
        raise AppError(status.HTTP_503_SERVICE_UNAVAILABLE, "AI_NOT_READY", "AI가 아직 연결되지 않았어요.")
    except Exception as e:
        logger.error("AI agent search failed: %s", type(e).__name__)
        raise AppError(status.HTTP_500_INTERNAL_SERVER_ERROR, "SERVER_ERROR", "검색 처리 중 오류가 발생했습니다.")

    # 2. 오프라인 장소 중 crowd가 null인 것들 1회 호출해 채움 (SPEC 6.3)
    now_kst = datetime.now(KST)
    missing_crowd_ids = [
        item.id
        for item in res.results
        if item.type == "offline" and item.crowd is None
    ]

    if missing_crowd_ids:
        try:
            crowd_list = await agent.estimate_crowd(missing_crowd_ids, now_kst)
            crowd_map = {missing_crowd_ids[i]: crowd_list[i] for i in range(min(len(missing_crowd_ids), len(crowd_list)))}
            for item in res.results:
                if item.id in crowd_map:
                    item.crowd = crowd_map[item.id]
        except NotImplementedError:
            pass  # local agent일 때 crowd는 남겨둠
        except Exception as e:
            logger.warning("Estimate crowd failed: %s", type(e).__name__)

    # 3. 응답 검증 및 필터링 (SPEC 6.3)
    allowed_hosts = [h.lower() for h in settings.allowed_online_hosts_list]
    valid_results: list[PlaceResult] = []

    for item in res.results:
        if item.type == "offline":
            if not item.offline:
                logger.warning("Filtered out item %s: missing offline data", item.id)
                continue
            if not _is_valid_jeju_coord(item.offline.lat, item.offline.lng):
                logger.warning(
                    "Filtered out item %s: coordinates out of Jeju bounds",
                    item.id,
                )
                continue
            valid_results.append(item)
        elif item.type == "online":
            if not item.online:
                logger.warning("Filtered out item %s: missing online data", item.id)
                continue
            if not _is_valid_deeplink(item.online.deeplink_url, allowed_hosts):
                logger.warning(
                    "Filtered out item %s: disallowed online deeplink host",
                    item.id,
                )
                continue
            valid_results.append(item)

    # 4. 최대 MAX_RESULTS개로 자름 (SPEC 6.3)
    res.results = valid_results[: settings.MAX_RESULTS]

    offline_results = [
        item for item in res.results if item.type == "offline" and item.offline
    ]
    if offline_results:
        origin = req.user_location or LatLng(lat=33.4996, lng=126.5312)
        destinations = [
            (item.id, LatLng(lat=item.offline.lat, lng=item.offline.lng))
            for item in offline_results
            if item.offline
        ]
        road_metrics = await get_router().metrics(origin, destinations)
        metrics_by_id = {metric.id: metric for metric in road_metrics}
        for item in offline_results:
            item.road = metrics_by_id.get(item.id)

    return res
