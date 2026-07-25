# =========================================================================
# PrivacyShield Enterprise Development Orchestration Script (PowerShell)
# =========================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "      Starting PrivacyShield Enterprise AI SaaS Stack     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Database and Redis container dependencies
Write-Host "[1/5] Booting PostgreSQL & Redis containers..." -ForegroundColor Green
if (Get-Command "docker-compose" -ErrorAction SilentlyContinue) {
    docker-compose up -d db redis
} else {
    docker compose up -d db redis
}

# Wait for database readiness
Write-Host "Waiting 5 seconds for PostgreSQL startup..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 2. Start the AI Microservice
Write-Host "[2/5] Starting AI Microservice (Port 8002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-services; ..\\.venv\\Scripts\\uvicorn main:app --port 8002 --reload"

# 3. Start the FastAPI API Gateway
Write-Host "[3/5] Starting FastAPI Gateway (Port 8000)..." -ForegroundColor Green
$env:PYTHONPATH="."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps/backend; $env:PYTHONPATH='.'; ..\\..\\.venv\\Scripts\\uvicorn app.main:app --port 8000 --reload"

# 4. Start Celery Async Task Worker
Write-Host "[4/5] Starting Celery Worker queue..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd apps/backend; $env:PYTHONPATH='.'; ..\\..\\.venv\\Scripts\\celery -A app.services.tasks.celery_app worker --loglevel=info -P solo"

# 5. Start Web Dashboard Front-End
Write-Host "[5/5] Launching React Web Dashboard (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev -w apps/web"

# Optional: Expo Mobile app client
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "PrivacyShield modules are spinning up in background shells." -ForegroundColor Green
Write-Host "  - Gateway: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  - AI Engine: http://localhost:8002/health" -ForegroundColor Yellow
Write-Host "  - Web Dashboard: http://localhost:5173" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "To launch the Expo client: npm run web -w apps/mobile" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
