import logging
import jose.jwt as jwt
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from contextvars import ContextVar
from typing import Optional

from ..core.config import settings
from ..database import AsyncSessionLocal
from ..models.models import AuditLog

logger = logging.getLogger(__name__)

# ContextVars to share current User ID and Tenant ID across async operations
current_user_id_ctx: ContextVar[Optional[int]] = ContextVar("current_user_id", default=None)
current_tenant_id_ctx: ContextVar[Optional[int]] = ContextVar("current_tenant_id", default=None)

class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    SaaS Tenant Context Injection and Request Audit Logging Middleware.
    Extracts tenant/user tokens and writes standard HTTP audit logs to PostgreSQL.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        user_id = None
        tenant_id = None
        
        # 1. Extract credentials from JWT
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id = payload.get("user_id")
                tenant_id = payload.get("tenant_id")
            except Exception:
                # Fail-silent context parsing, downstream routers will reject invalid tokens
                pass

        # 2. Inject context values to ContextVars for query session scoping
        current_user_id_ctx.set(user_id)
        current_tenant_id_ctx.set(tenant_id)
        
        # Execute request
        response: Response = await call_next(request)
        
        # 3. Log audits asynchronously for mutating or security actions
        path = request.url.path
        method = request.method
        status_code = response.status_code
        
        # We audit all non-GET requests (mutations) and auth requests
        if method in ["POST", "PUT", "DELETE", "PATCH"] or "/auth/" in path:
            action = f"{method} {path}"
            
            # Simple audit insert
            async def write_audit():
                try:
                    async with AsyncSessionLocal() as session:
                        # Create audit record
                        client_ip = request.client.host if request.client else None
                        severity = "low"
                        if status_code >= 400:
                            severity = "medium"
                        if "/auth/login" in path and status_code >= 400:
                            severity = "high"
                            
                        # Resolve audit target if present in request state (e.g. document name)
                        target = getattr(request.state, "audit_target", None)
                        
                        audit = AuditLog(
                            user_id=user_id,
                            action=action,
                            target=target or f"HTTP {status_code}",
                            severity=severity,
                            ip_address=client_ip
                        )
                        # Set tenant column if table migration complete
                        if hasattr(audit, "organization_id"):
                            setattr(audit, "organization_id", tenant_id)
                            
                        session.add(audit)
                        await session.commit()
                except Exception as e:
                    logger.error(f"Audit log database commit failure: {e}")

            # Run DB insert in background task to not block API response
            import asyncio
            asyncio.create_task(write_audit())

        return response
