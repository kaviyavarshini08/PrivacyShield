from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc
from typing import List

from ..database import get_db
from ..models.models import ProcessingQueue, User
from ..schemas.schemas import ProcessingQueueResponse
from ..core.security import get_current_user

router = APIRouter()

@router.get("", response_model=List[ProcessingQueueResponse])
@router.get("/", response_model=List[ProcessingQueueResponse])
async def get_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the processing queue.
    If manager or analyst, returns all items.
    If the user is a standard user, returns only their own document queue entries.
    """
    # Fetch queue items with document relation loaded eager
    stmt = (
        select(ProcessingQueue)
        .join(ProcessingQueue.document)
        .options(selectinload(ProcessingQueue.document))
        .order_by(desc(ProcessingQueue.queued_at))
    )
    
    stmt = stmt.filter(ProcessingQueue.document.has(owner_id=current_user.id))
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    return items
