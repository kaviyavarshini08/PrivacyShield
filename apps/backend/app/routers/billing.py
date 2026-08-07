from fastapi import APIRouter, Depends
from ..models.models import User
from ..core.security import get_current_user

router = APIRouter()

@router.get("/status")
async def billing_status(current_user: User = Depends(get_current_user)):
    """Billing functionality is currently not enabled."""
    return {"message": "Billing features not enabled in this version."}
