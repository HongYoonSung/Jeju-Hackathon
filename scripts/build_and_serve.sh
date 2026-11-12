#!/usr/bin/env bash
set -e

# 프론트 빌드 후 백엔드 단독 정적 서빙 스크립트 (프로세스 1개 실행)

echo "=== 제주얼마꽈 프로덕션 빌드 및 단독 실행 ==="

# 루트 디렉토리 이동
cd "$(dirname "$0")/.."

# 1. 프론트엔드 빌드
echo "[1/2] 프론트엔드 빌드 중..."
cd frontend
npm run build
cd ..

# 2. 백엔드 단일 프로세스 실행
echo "[2/2] FastAPI 서버 구동 중 (포트 8000)..."
PYTHON_BIN="python"
if [ -f ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
elif [ -f ".venv/Scripts/python.exe" ]; then
  PYTHON_BIN=".venv/Scripts/python.exe"
fi

export PYTHONPATH="backend"
$PYTHON_BIN -m uvicorn app.main:app --host 0.0.0.0 --port 8000
