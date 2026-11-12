#!/usr/bin/env bash
set -e

# 백엔드 + 프론트 동시 개발 실행 스크립트

echo "=== 제주얼마꽈 개발 서버 시작 ==="

# 루트 디렉토리 이동
cd "$(dirname "$0")/.."

# 가상환경 파이썬 확인
PYTHON_BIN="python"
if [ -f ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
elif [ -f ".venv/Scripts/python.exe" ]; then
  PYTHON_BIN=".venv/Scripts/python.exe"
fi

# 백엔드 uvicorn 백그라운드 실행
export PYTHONPATH="backend"
$PYTHON_BIN -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# 프론트엔드 vite 개발 서버 실행
cd frontend
npm run dev &
FRONTEND_PID=$!

# 종료 시 둘 다 kill
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
