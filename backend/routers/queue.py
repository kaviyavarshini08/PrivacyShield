from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models.models import ProcessingQueue, User
from ..routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def get_queue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns the processing queue.
    If the user is an admin, returns all items.
    If the user is a standard user, returns only their documents.
    """
    query = db.query(ProcessingQueue).join(ProcessingQueue.document)
    
    if current_user.role != "admin":
        query = query.filter(ProcessingQueue.document.has(owner_id=current_user.id))
        
    items = query.order_by(desc(ProcessingQueue.queued_at)).all()
    
    # We serialize manually for now to keep it simple, but we should use Pydantic schemas ideally
    result = []
    for item in items:
        import time
        
        # Calculate time since upload
        time_diff = "Just now" # simplified for mock
        if item.status == "Completed" and item.processing_time_ms:
            time_diff = f"{int(item.processing_time_ms / 1000)}s ago"

        result.append({
            "id": str(item.id),
            "name": item.document.original_name,
            "status": item.status,
            "pii": item.pii_found_count,
            "uploader": item.document.owner.full_name or item.document.owner.email,
            "time": time_diff
        })
        
    return result
