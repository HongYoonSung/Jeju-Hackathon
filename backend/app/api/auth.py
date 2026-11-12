from fastapi import APIRouter, status
from app.errors import AppError

router = APIRouter()


@router.post("/login")
async def login():
    raise AppError(
        status.HTTP_501_NOT_IMPLEMENTED,
        "NOT_IMPLEMENTED",
        "준비 중인 기능입니다.",
    )


@router.post("/signup")
async def signup():
    raise AppError(
        status.HTTP_501_NOT_IMPLEMENTED,
        "NOT_IMPLEMENTED",
        "준비 중인 기능입니다.",
    )
