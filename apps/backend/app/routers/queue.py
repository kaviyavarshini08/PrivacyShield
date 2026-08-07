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
    If the user is admin, manager, or analyst, returns all items.
    If the user is a standard user, returns only their own document queue entries.
    """
    # Fetch queue items with document relation loaded eager
    stmt = (
        select(ProcessingQueue)
        .join(ProcessingQueue.document)
        .options(selectinload(ProcessingQueue.document))
        .order_by(desc(ProcessingQueue.queued_at))
    )
    
    from ..middleware.audit import current_tenant_id_ctx
    tenant_id = current_tenant_id_ctx.get()
    
    if tenant_id is not None:
        stmt = stmt.filter(ProcessingQueue.document.has(organization_id=tenant_id))
    elif current_user.role == "user":
        stmt = stmt.filter(ProcessingQueue.document.has(owner_id=current_user.id))
        
    result = await db.execute(stmt)
    items = result.scalars().all()
    
    return items
