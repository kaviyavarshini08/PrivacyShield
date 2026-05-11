from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.models import Document, ProcessingQueue, User, AuditLog
from ..services.storage import storage_service
from .auth import get_current_user
import uuid

router = APIRouter()

from ..services.ai_pipeline import process_document

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    if file.content_type not in allowed_types and not file.filename.endswith(('.pdf', '.docx', '.txt')):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT allowed.")

    # Save file via Storage Service
    file_path = await storage_service.upload_file(file)

    # Calculate size (simple approximation for mock, actual would seek/read)
    # file.file.seek(0, 2)
    # file_size = file.file.tell()
    # file.file.seek(0)
    file_size = 1024 * 1024 # Mock 1MB

    # Create Document DB Record
    new_doc = Document(
        filename=f"{uuid.uuid4()}_{file.filename}",
        original_name=file.filename,
        file_size=file_size,
        content_type=file.content_type,
        storage_path=file_path,
        owner_id=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Add to Processing Queue
    new_queue_item = ProcessingQueue(
        document_id=new_doc.id,
        status="Processing" # Mocking immediate processing
    )
    db.add(new_queue_item)

    # Log Audit Action
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        target=new_doc.original_name,
        severity="low"
    )
    db.add(audit_log)
    
    db.commit()

    # Trigger Background Processing
    background_tasks.add_task(process_document, new_doc.id, db)

    return {"message": "Document uploaded successfully", "document_id": new_doc.id}
