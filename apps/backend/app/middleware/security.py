import uuid
import time
import logging
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from ..core.logging import correlation_id_ctx
from ..database import redis_client

logger = logging.getLogger(__name__)

class RequestTracingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that generates or extracts an X-Correlation-ID tracing header,
    stores it in ContextVars for logging context, and returns it in the response.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        correlation_id_ctx.set(correlation_id)
        
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        response: Response = await call_next(request)
        process_time = time.time() - start_time
        
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        
        return response

class SecureHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting strict security headers to prevent Clickjacking, XSS, and MIME-sniffing.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        
        # Clickjacking defense
        response.headers["X-Frame-Options"] = "DENY"
        # MIME sniffing defense
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        # Content Security Policy (CSP) base configuration
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' http://localhost:8000 http://localhost:8001 http://localhost:8002;"
        )
        return response

class RedisRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-backed sliding window rate limiter middleware.
    Restricts IP requests to a set maximum capacity (e.g., 60 requests / minute).
    """
    def __init__(self, app, rate_limit: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next) -> Response:
        # Bypass rate limits for metrics and health checks
        path = request.url.path
        if "/health" in path or "/metrics" in path:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown-ip"
        key = f"rate_limit:{client_ip}:{int(time.time() / self.window_seconds)}"

        try:
            current_count = await redis_client.get(key)
            if current_count and int(current_count) >= self.rate_limit:
                logger.warning(f"IP {client_ip} has exceeded rate limit capacity ({self.rate_limit} requests/window).")
                return Response(
                    content='{"detail": "Too many requests. Rate limit exceeded."}',
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    media_type="application/json"
                )

            # Increment count using a Redis transaction-like pipeline
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.window_seconds)
            await pipe.execute()
            
        except Exception as e:
            # Fallback (fail-open) if Redis goes offline, preserving service availability
            logger.error(f"Redis rate limiting communication error: {e}")

        return await call_next(request)
