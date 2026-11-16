from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path


class Settings(BaseSettings):
    # AI 슬롯
    AI_BACKEND: str = "mock"  # mock | local
    AI_ENDPOINT: str = ""
    AI_TIMEOUT_S: float = 60.0

    # 지도/경로
    GEOCODER: str = "mock"  # mock | nominatim | naver
    ROUTER: str = "osrm"  # osrm | naver | estimate
    OSRM_BASE_URL: str = "http://127.0.0.1:5000"
    ROUTER_TIMEOUT_S: float = 5.0
    NAVER_CLIENT_ID: str = ""
    NAVER_CLIENT_SECRET: str = ""

    # 보안/동작
    AUTH_DB_PATH: str = str(
        Path(__file__).resolve().parents[2]
        / "backend"
        / "data"
        / "auth.sqlite3"
    )
    AUTH_COOKIE_SECURE: bool = False
    AUTH_SESSION_TTL_HOURS: int = 168
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ALLOWED_ONLINE_HOSTS: str = (
        "www.coupang.com,search.shopping.naver.com,search.11st.co.kr,browse.gmarket.co.kr"
    )
    MAX_RESULTS: int = 30
    LOG_LEVEL: str = "INFO"

    # 프론트
    VITE_TILE_URL: str = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    VITE_FEATURE_TRANSIT: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_online_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_ONLINE_HOSTS.split(",") if h.strip()]


settings = Settings()
