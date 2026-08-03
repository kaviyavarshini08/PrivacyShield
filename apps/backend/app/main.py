from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram
import os
import time
import logging

from .database import engine, Base, AsyncSessionLocal, redis_client
from .routers import auth, upload, queue, analysis, compliance, chat, teams, billing
from .core.config import settings
from .core.logging import setup_logging, correlation_id_ctx
from .middleware.security import RequestTracingMiddleware, SecureHeadersMiddleware, RedisRateLimitMiddleware
from .middleware.audit import AuditLogMiddleware

# 1. Initialize Structured JSON Logging
setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 2. Configure Prometheus Metrics
REQUEST_COUNT = Counter(
    "privacyshield_api_requests_total",
    "Total count of incoming API requests",
    ["method", "endpoint", "status_code"]
)
REQUEST_LATENCY = Histogram(
    "privacyshield_api_request_latency_seconds",
    "API request latency distribution",
    ["method", "endpoint"]
)

@app.middleware("http")
async def prometheus_metrics_middleware(request: Request, call_next):
    path = request.url.path
    if path == "/metrics" or "/health" in path:
        return await call_next(request)
        
    method = request.method
    start_time = time.time()
    
    response = await call_next(request)
    
    latency = time.time() - start_time
    REQUEST_COUNT.labels(method=method, endpoint=path, status_code=response.status_code).inc()
    REQUEST_LATENCY.labels(method=method, endpoint=path).observe(latency)
    
    return response

# 3. Register Security and Audit Middlewares
# Order matters: Tracing and Secure Headers are applied first to handle the response boundary
app.add_middleware(SecureHeadersMiddleware)
app.add_middleware(RequestTracingMiddleware)
app.add_middleware(RedisRateLimitMiddleware, rate_limit=100, window_seconds=60) # 100 requests per minute
app.add_middleware(AuditLogMiddleware)

# Configure CORS
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://localhost:8081,http://localhost:19006"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Centralized Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = correlation_id_ctx.get()
    logger.exception(f"Unhandled server exception [Correlation ID: {correlation_id}]: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred. Please contact system support.",
            "correlation_id": correlation_id
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code >= 500:
        logger.error(f"HTTP Server Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# 5. DB Initialization
@app.on_event("startup")
async def startup():
    logger.info("Initializing database tables...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database tables: {str(e)}")

# 6. Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(upload.router, prefix=f"{settings.API_V1_STR}/documents/upload", tags=["Documents"])
app.include_router(queue.router, prefix=f"{settings.API_V1_STR}/queue", tags=["Processing Queue"])
app.include_router(analysis.router, prefix=f"{settings.API_V1_STR}/analysis", tags=["Document Analysis"])
app.include_router(compliance.router, prefix=f"{settings.API_V1_STR}/compliance", tags=["Compliance Audits"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["AI Chat Assistant"])
app.include_router(teams.router, prefix=f"{settings.API_V1_STR}/teams", tags=["Team Workspaces"])
app.include_router(billing.router, prefix=f"{settings.API_V1_STR}/billing", tags=["Stripe Billing"])

# 7. Health Check Probes
@app.get("/health", tags=["Health Checks"])
def health():
    return {"status": "healthy"}

@app.get("/health/liveness", tags=["Health Checks"])
def liveness():
    """Liveness probe: verifies that the python process is alive."""
    return {"status": "alive", "timestamp": time.time()}

@app.get("/health/readiness", tags=["Health Checks"])
async def readiness():
    """Readiness probe: validates database connection pool and Redis connection state."""
    db_ok = False
    redis_ok = False
    
    # Check Database connection
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Readiness check failed - DB connection failed: {e}")
        
    # Check Redis connection
    try:
        await redis_client.ping()
        redis_ok = True
    except Exception as e:
        logger.error(f"Readiness check failed - Redis ping failed: {e}")
        
    if db_ok and redis_ok:
        return {"status": "ready", "db": "connected", "redis": "connected"}
        
    errors = []
    if not db_ok:
        errors.append("db_disconnected")
    if not redis_ok:
        errors.append("redis_disconnected")
        
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "not_ready", "errors": errors}
    )

@app.get("/metrics", tags=["Monitoring"])
def get_metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/")
def read_root():
    return {"message": "PrivacyShield Enterprise API is running", "docs_path": "/docs"}
