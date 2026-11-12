import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_geocode_success():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/geocode", json={"address": "노형동"})
        assert resp.status_code == 200
        data = resp.json()
        assert "lat" in data
        assert "lng" in data
        assert "노형동" in data["label"]
        assert data["provider"] == "mock"


@pytest.mark.asyncio
async def test_geocode_fallback_default():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/geocode", json={"address": "없는마을 999"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["lat"] == 33.4996
        assert data["lng"] == 126.5312
        assert "(대략)" in data["label"]


@pytest.mark.asyncio
async def test_geocode_empty_address_422():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/geocode", json={"address": "   "})
        assert resp.status_code == 422
        data = resp.json()
        assert data["error"]["code"] == "VALIDATION_ERROR"
