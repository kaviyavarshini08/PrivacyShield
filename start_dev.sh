#!/bin/bash

# =========================================================================
# PrivacyShield Enterprise Development Orchestration Script (Bash)
# =========================================================================

echo -e "\033[36m==========================================================\033[0m"
echo -e "\033[36m      Starting PrivacyShield Enterprise AI SaaS Stack     \033[0m"
echo -e "\033[36m==========================================================\033[0m"

# 1. Start Database and Redis container dependencies
echo -e "\033[32m[1/5] Booting PostgreSQL & Redis containers...\033[0m"
if command -v docker-compose &> /dev/null; then
    docker-compose up -d db redis
else
    docker compose up -d db redis
fi

# Wait for database readiness
echo -e "\033[33mWaiting 5 seconds for PostgreSQL startup...\033[0m"
sleep 5

# 2. Start the AI Microservice
echo -e "\033[32m[2/5] Starting AI Microservice (Port 8002)...\033[0m"
python3 -m venv .venv --quiet 2>/dev/null || true
source .venv/bin/activate 2>/dev/null || source venv/bin/activate 2>/dev/null || true
cd ai-services && uvicorn main:app --port 8002 --reload &
AI_PID=$!
cd ..

# 3. Start the FastAPI API Gateway
echo -e "\033[32m[3/5] Starting FastAPI Gateway (Port 8000)...\033[0m"
export PYTHONPATH="."
cd apps/backend && uvicorn app.main:app --port 8000 --reload &
API_PID=$!
cd ..

# 4. Start Celery Async Task Worker
echo -e "\033[32m[4/5] Starting Celery Worker queue...\033[0m"
cd apps/backend && celery -A app.services.tasks.celery_app worker --loglevel=info &
CELERY_PID=$!
cd ..

# 5. Start Web Dashboard Front-End
echo -e "\033[32m[5/5] Launching React Web Dashboard (Port 5173)...\033[0m"
npm run dev -w apps/web &
WEB_PID=$!

echo -e "\033[36m----------------------------------------------------------\033[0m"
echo -e "\033[32mPrivacyShield modules are spinning up in background...\033[0m"
echo -e "\033[33m  - Gateway: http://localhost:8000/docs\033[0m"
echo -e "\033[33m  - AI Engine: http://localhost:8002/health\033[0m"
echo -e "\033[33m  - Web Dashboard: http://localhost:5173\033[0m"
echo -e "\033[36m----------------------------------------------------------\033[0m"
echo -e "\033[32mTo launch the Expo client: npm run web -w apps/mobile\033[0m"
echo -e "\033[36m==========================================================\033[0m"

# Handle graceful shutdown on Ctrl+C
trap "kill $AI_PID $API_PID $CELERY_PID $WEB_PID; exit" INT
wait
