import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from app.schemas import SearchResponse, PlaceResult, OnlinePlace, PriceInfo


@pytest.mark.asyncio
async def test_search_normal_and_crowd_filled(monkeypatch):
    monkeypatch.setattr(settings, "AI_BACKEND", "mock")
    monkeypatch.setattr(settings, "ROUTER", "estimate")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/search",
            json={
                "query": "우유 1L 제일 싼 곳",
                "user_location": {"lat": 33.4996, "lng": 126.5312},
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) > 0

        # 오프라인 항목은 crowd가 채워져 있어야 함 (SPEC 6.3)
        offline_items = [r for r in data["results"] if r["type"] == "offline"]
        assert len(offline_items) > 0
        for off in offline_items:
            assert off["crowd"] is not None
            assert off["crowd"]["level"] in ["low", "medium", "high", "very_high"]
            assert off["crowd"]["estimated_people"] >= 0
            assert off["road"]["distance_m"] > 0
            assert off["road"]["source"] == "estimate"


@pytest.mark.asyncio
async def test_search_empty_query_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/search", json={"query": "   "})
        assert resp.status_code == 422
        data = resp.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_search_disallowed_deeplink_filtered(monkeypatch):
    monkeypatch.setattr(settings, "AI_BACKEND", "mock")
    monkeypatch.setattr(settings, "ROUTER", "estimate")
    # 가짜 에이전트가 허용되지 않은 deeplink_url을 반환하도록 주입
    from app.ai.registry import get_ai_agent
    agent = get_ai_agent()

    original_search = agent.search

    async def fake_search(req):
        res = await original_search(req)
        # 악성/비허용 도메인 아이템 추가
        bad_item = PlaceResult(
            id="evil_001",
            type="online",
            rank=999,
            name="악성 사이트",
            price=PriceInfo(amount=100, unit_label="1개", checked_at="2026-11-12T00:00:00+09:00"),
            online=OnlinePlace(site_name="해킹몰", deeplink_url="https://evil-phishing.com/steal"),
            offline=None,
            crowd=None,
        )
        res.results.append(bad_item)
        return res

    monkeypatch.setattr(agent, "search", fake_search)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/search", json={"query": "라면"})
        assert resp.status_code == 200
        data = resp.json()
        ids = [r["id"] for r in data["results"]]
        assert "evil_001" not in ids


@pytest.mark.asyncio
async def test_search_local_agent_not_ready(monkeypatch):
    monkeypatch.setattr(settings, "AI_BACKEND", "local")
    from app.ai import local_model_agent
    monkeypatch.setattr(local_model_agent, "GEMINI_API_KEY", "")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/search", json={"query": "우유"})
        assert resp.status_code == 503
        data = resp.json()
        assert data["error"]["code"] == "AI_NOT_READY"
        assert data["error"]["message"] == "AI가 아직 연결되지 않았어요."


@pytest.mark.asyncio
async def test_search_gemini_unavailable_is_reported_as_503(monkeypatch):
    from ai.agent_runner import GeminiAPIError
    from app.ai.local_model_agent import LocalModelAgent

    monkeypatch.setattr(settings, "AI_BACKEND", "local")

    async def unavailable(self, req):
        raise GeminiAPIError(
            503,
            "AI_SERVICE_UNAVAILABLE",
            "AI 서비스가 혼잡해 응답하지 않습니다. 잠시 후 다시 시도해 주세요.",
        )

    monkeypatch.setattr(LocalModelAgent, "search", unavailable)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/search", json={"query": "우유"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"
