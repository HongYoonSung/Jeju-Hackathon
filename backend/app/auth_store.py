import hashlib
import hmac
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import settings

PASSWORD_ITERATIONS = 310_000


def _connect() -> sqlite3.Connection:
    db_path = Path(settings.AUTH_DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
        """
    )
    return connection


@contextmanager
def _connection() -> Iterator[sqlite3.Connection]:
    connection = _connect()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def _password_hash(password: str, salt: bytes) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    ).hex()


def create_user(user_id: str, password: str) -> bool:
    salt = secrets.token_bytes(16)
    password_hash = _password_hash(password, salt)
    try:
        with _connection() as connection:
            connection.execute(
                "INSERT INTO users (id, password_salt, password_hash, created_at) "
                "VALUES (?, ?, ?, ?)",
                (user_id, salt.hex(), password_hash, int(time.time())),
            )
        return True
    except sqlite3.IntegrityError:
        return False


def authenticate_user(user_id: str, password: str) -> bool:
    with _connection() as connection:
        user = connection.execute(
            "SELECT password_salt, password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if user is None:
        return False

    salt = bytes.fromhex(user["password_salt"])
    candidate_hash = _password_hash(password, salt)
    return hmac.compare_digest(candidate_hash, user["password_hash"])


def create_session(user_id: str) -> tuple[str, int]:
    token = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + settings.AUTH_SESSION_TTL_HOURS * 3600
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    with _connection() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at),
        )
    return token, expires_at


def get_session_user(token: str | None) -> str | None:
    if not token:
        return None

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = int(time.time())
    with _connection() as connection:
        row = connection.execute(
            "SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?",
            (token_hash, now),
        ).fetchone()
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    return row["user_id"] if row else None


def delete_session(token: str | None) -> None:
    if not token:
        return
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with _connection() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
