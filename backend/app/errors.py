from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "VALIDATION_ERROR",
        "입력값이 올바르지 않습니다.",
    )


async def http_error_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code_map = {
        404: ("NOT_FOUND", "요청하신 리소스를 찾을 수 없습니다."),
        501: ("NOT_IMPLEMENTED", "준비 중인 기능입니다."),
        503: ("AI_NOT_READY", "AI가 아직 연결되지 않았어요."),
        504: ("AI_TIMEOUT", "AI 응답 시간이 초과되었습니다."),
        502: ("UPSTREAM_ERROR", "외부 서비스 연동에 실패했습니다."),
    }
    code, default_msg = code_map.get(
        exc.status_code, ("SERVER_ERROR", "서버 오류가 발생했습니다.")
    )
    msg = exc.detail if isinstance(exc.detail, str) and exc.detail else default_msg
    return error_response(exc.status_code, code, msg)
