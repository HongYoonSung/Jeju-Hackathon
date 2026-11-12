import logging
import time
import uuid
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.errors import (
    AppError,
    app_error_handler,
    validation_error_handler,
    http_error_handler,
)
from app.api import health, search, geocode, route, transit, auth

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("jeju_eolmakkwa")

app = FastAPI(title="제주얼마꽈 API", version="0.1.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 예외 핸들러 등록
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
app.add_exception_handler(StarletteHTTPException, http_error_handler)


# 보안/개인정보 로깅 미들웨어 (검색어, 주소, 좌표 로그 제외 - SPEC 8.4)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    req_id = str(uuid.uuid4())
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "request_id=%s method=%s path=%s status=%s duration=%.2fms",
        req_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# 라우터 등록
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(geocode.router, prefix="/api", tags=["geocode"])
app.include_router(route.router, prefix="/api", tags=["route"])
app.include_router(transit.router, prefix="/api", tags=["transit"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# 정적 서빙 (frontend/dist 빌드 산출물) - SPEC 2장
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists() and dist_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target = dist_dir / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(dist_dir / "index.html")
