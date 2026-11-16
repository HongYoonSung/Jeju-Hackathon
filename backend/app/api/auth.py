from fastapi import APIRouter, Request, Response, status

from app import auth_store
from app.config import settings
from app.errors import AppError
from app.schemas import AuthResponse, LoginRequest, SignupRequest

router = APIRouter()
SESSION_COOKIE = "jeju_session"
SESSION_MAX_AGE = settings.AUTH_SESSION_TTL_HOURS * 3600


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _create_session(response: Response, user_id: str) -> AuthResponse:
    token, _ = auth_store.create_session(user_id)
    _set_session_cookie(response, token)
    return AuthResponse(id=user_id)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, response: Response):
    user_id = payload.id.strip()
    if not auth_store.create_user(user_id, payload.password):
        raise AppError(
            status.HTTP_409_CONFLICT,
            "USER_EXISTS",
            "이미 사용 중인 아이디예요.",
        )
    return _create_session(response, user_id)


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, response: Response):
    user_id = payload.id.strip()
    if not auth_store.authenticate_user(user_id, payload.password):
        raise AppError(
            status.HTTP_401_UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "아이디 또는 비밀번호를 확인해 주세요.",
        )
    return _create_session(response, user_id)


@router.get("/me", response_model=AuthResponse)
async def current_user(request: Request):
    user_id = auth_store.get_session_user(request.cookies.get(SESSION_COOKIE))
    if not user_id:
        raise AppError(
            status.HTTP_401_UNAUTHORIZED,
            "UNAUTHENTICATED",
            "로그인이 필요해요.",
        )
    return AuthResponse(id=user_id)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response):
    auth_store.delete_session(request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(
        key=SESSION_COOKIE,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
