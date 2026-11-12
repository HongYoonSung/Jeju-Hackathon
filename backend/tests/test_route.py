import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_route_estimate_success():
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
