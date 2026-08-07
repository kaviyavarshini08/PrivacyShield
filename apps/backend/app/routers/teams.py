from fastapi import APIRouter, Depends
from ..models.models import User
from ..core.security import get_current_user

router = APIRouter()

@router.get("/")
async def get_teams(current_user: User = Depends(get_current_user)):
    """Teams functionality is currently not available."""
    return {"message": "Team features not enabled in this version."}
