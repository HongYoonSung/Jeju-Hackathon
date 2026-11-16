import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import settings
from app.providers.route_osrm import OSRMRouter
from app.schemas import LatLng


@pytest.mark.asyncio
async def test_route_estimate_success(monkeypatch):
    monkeypatch.setattr(settings, "ROUTER", "estimate")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/route",
            json={
                "origin": {"lat": 33.4996, "lng": 126.5312},
                "destination": {"lat": 33.4846, "lng": 126.4783},
                "mode": "driving",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["distance_m"] > 0
        assert data["duration_s"] > 0
        assert len(data["geometry"]) == 2
        assert data["provider"] == "estimate"


@pytest.mark.asyncio
async def test_osrm_metrics_uses_road_matrix(monkeypatch):
    monkeypatch.setattr(settings, "OSRM_BASE_URL", "http://osrm.test")

    class MockResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "distances": [[0, 2480]],
                "durations": [[0, 390]],
            }

    class MockClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, url, params):
            assert "/table/v1/driving/" in url
            assert params["sources"] == "0"
            return MockResponse()

    monkeypatch.setattr(
        "app.providers.route_osrm.httpx.AsyncClient",
        lambda **_kwargs: MockClient(),
    )
    router = OSRMRouter()
    result = await router.metrics(
        LatLng(lat=33.4996, lng=126.5312),
        [("store_001", LatLng(lat=33.4846, lng=126.4783))],
    )

    assert len(result) == 1
    assert result[0].id == "store_001"
    assert result[0].distance_m == 2480
    assert result[0].duration_s == 390
    assert result[0].source == "osrm"


@pytest.mark.asyncio
async def test_metrics_endpoint_reports_estimate_source(monkeypatch):
    monkeypatch.setattr(settings, "ROUTER", "estimate")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/metrics",
            json={
                "origin": {"lat": 33.4996, "lng": 126.5312},
                "destinations": [
                    {"id": "store_001", "lat": 33.4846, "lng": 126.4783}
                ],
            },
        )
    assert response.status_code == 200
    metric = response.json()["metrics"][0]
    assert metric["distance_m"] > 0
    assert metric["source"] == "estimate"
