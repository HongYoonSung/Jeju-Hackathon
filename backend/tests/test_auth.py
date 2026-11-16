import sqlite3

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_signup_login_and_logout_use_http_only_session(monkeypatch, tmp_path):
    database_path = tmp_path / "auth.sqlite3"
    monkeypatch.setattr(settings, "AUTH_DB_PATH", str(database_path))
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        signup = await client.post(
            "/api/auth/signup",
            json={
                "id": "jejuuser",
                "password": "secure-pass-123",
                "passwordConfirm": "secure-pass-123",
            },
        )
        assert signup.status_code == 201
        assert "httponly" in signup.headers["set-cookie"].lower()
        assert (await client.get("/api/auth/me")).json() == {"id": "jejuuser"}

        duplicate = await client.post(
            "/api/auth/signup",
            json={
                "id": "jejuuser",
                "password": "secure-pass-123",
                "passwordConfirm": "secure-pass-123",
            },
        )
        assert duplicate.status_code == 409
        assert duplicate.json()["error"]["code"] == "USER_EXISTS"

        logout = await client.post("/api/auth/logout")
        assert logout.status_code == 204
        assert (await client.get("/api/auth/me")).status_code == 401

        login = await client.post(
            "/api/auth/login",
            json={"id": "jejuuser", "password": "secure-pass-123"},
        )
        assert login.status_code == 200
        assert (await client.get("/api/auth/me")).json() == {"id": "jejuuser"}

    with sqlite3.connect(database_path) as connection:
        stored_password = connection.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            ("jejuuser",),
        ).fetchone()[0]
    assert stored_password != "secure-pass-123"


@pytest.mark.asyncio
async def test_login_rejects_invalid_password(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "AUTH_DB_PATH", str(tmp_path / "auth.sqlite3"))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/signup",
            json={
                "id": "jejuuser",
                "password": "secure-pass-123",
                "passwordConfirm": "secure-pass-123",
            },
        )
        response = await client.post(
            "/api/auth/login",
            json={"id": "jejuuser", "password": "wrong-pass-123"},
        )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"
