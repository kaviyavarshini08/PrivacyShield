from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from ..database import get_db
from ..models.models import User
from ..core.security import get_current_user, get_password_hash

router = APIRouter()

# Global Security Policies in-memory store
security_policies_state = {
    "mfa_enabled": False,
    "auto_lock": False,
    "strict_upload": True
}

class SecurityPolicyUpdateRequest(BaseModel):
    mfa_enabled: Optional[bool] = None
    auto_lock: Optional[bool] = None
    strict_upload: Optional[bool] = None

@router.get("/security-policies")
async def get_security_policies(
    current_user: User = Depends(get_current_user)
):
    """Retrieves global security policy settings."""
    return security_policies_state

@router.put("/security-policies")
async def update_security_policies(
    req: SecurityPolicyUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Updates global security policies."""
    if req.mfa_enabled is not None:
        security_policies_state["mfa_enabled"] = req.mfa_enabled
    if req.auto_lock is not None:
        security_policies_state["auto_lock"] = req.auto_lock
    if req.strict_upload is not None:
        security_policies_state["strict_upload"] = req.strict_upload
        
    return {"message": "Security policies updated successfully", "policies": security_policies_state}
