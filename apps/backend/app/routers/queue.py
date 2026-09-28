from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc, func
from typing import List

from ..database import get_db
from ..models.models import ProcessingQueue, DetectedEntity, Document, User
from ..schemas.schemas import ProcessingQueueResponse
from ..core.security import get_current_user

router = APIRouter()

# Only these entity types count as real PII
VALID_PII_TYPES = {
    "IN_AADHAAR", "IN_PAN", "PASSPORT", "IN_VOTER_ID", "IN_BANK_ACCOUNT",
    "UPI_ID", "IN_ABHA_ID", "BIOMETRIC_DATA", "CREDIT_CARD",
    "EMAIL_ADDRESS", "PHONE_NUMBER", "API_KEY", "SECRET_LEAK",
}

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

    # Recompute pii_found_count from actual valid PII entities in the database
    for item in items:
        count_stmt = select(func.count(DetectedEntity.id)).filter(
            DetectedEntity.document_id == item.document_id,
            DetectedEntity.entity_type.in_(VALID_PII_TYPES)
        )
        count_res = await db.execute(count_stmt)
        item.pii_found_count = count_res.scalar() or 0

    return items
