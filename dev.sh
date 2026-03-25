#!/bin/sh
# SynapseAI 개발 서버 동시 실행 (로컬 PostgreSQL 사용)
# 사용법: ./dev.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"

trap 'kill 0' EXIT

echo "Creating DB tables..."
cd "$ROOT/backend" && python3 -c "
import asyncio
from app.db.session import engine
from app.models import Base
async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print('Tables created.')
asyncio.run(init())
" 2>&1

echo "Starting backend (FastAPI :8000)..."
cd "$ROOT/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

echo "Starting frontend (Next.js :3000)..."
cd "$ROOT/frontend" && npm run dev &

wait
