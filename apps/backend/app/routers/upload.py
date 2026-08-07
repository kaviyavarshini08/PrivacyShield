from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import os

from ..database import get_db
from ..models.models import Document, ProcessingQueue, User, AuditLog
from ..services.storage import storage_service
from ..core.security import get_current_user
from ..services.tasks import process_document_task

router = APIRouter()

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_types = [
        "application/pdf", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/pjpeg",
        "image/x-png",
        "image/webp",
        "text/csv",
        "application/zip",
        "application/x-zip-compressed"
    ]
    file_ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = ['.pdf', '.docx', '.xlsx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.csv', '.zip']
    
    if file.content_type not in allowed_types and file_ext not in allowed_exts:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Supported types: PDF, DOCX, XLSX, TXT, PNG, JPG, JPEG, WEBP, CSV, ZIP."
        )

    try:
        # Save file via Storage Service
        file_path = await storage_service.upload_file(file)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write file to disk: {str(e)}"
        )

    # Check for MIME spoofing
    from ..services.security_scanner import verify_file_mime_header, scan_for_malware, quarantine_file
    if not verify_file_mime_header(file_path, file.content_type):
        quarantine_file(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Violation: File headers do not match declared extension."
        )

    # Scan for malware
    is_clean = await scan_for_malware(file_path)
    if not is_clean:
        quarantine_path = quarantine_file(file_path)
        # Register failed record for historical audits
        new_doc = Document(
            filename=os.path.basename(quarantine_path),
            original_name=file.filename,
            file_size=file_size,
            content_type=file.content_type or "application/octet-stream",
            storage_path=quarantine_path,
            owner_id=current_user.id,
            status="failed"
        )
        db.add(new_doc)
        audit_log = AuditLog(
            user_id=current_user.id,
            action="MALWARE_DETECTED",
            target=file.filename,
            severity="high"
        )
        db.add(audit_log)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Alert: Malware detected in uploaded file. Access blocked."
        )

    # Create Document DB Record
    new_doc = Document(
        filename=os.path.basename(file_path),
        original_name=file.filename,
        file_size=file_size,
        content_type=file.content_type or "application/octet-stream",
        storage_path=file_path,
        owner_id=current_user.id,
        status="uploaded"
    )
    db.add(new_doc)
    await db.flush() # Populate the ID without committing

    # Add to Processing Queue
    new_queue_item = ProcessingQueue(
        document_id=new_doc.id,
        status="queued"
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
    await db.commit()

    # Trigger Async Background Processing (with immediate inline execution fallback)
    try:
        process_document_task.delay(new_doc.id)
    except Exception as cel_err:
        logger.warning(f"Celery task dispatch fallback to inline execution: {cel_err}")
        process_document_task(new_doc.id)

    return {
        "message": "Document uploaded successfully",
        "document_id": new_doc.id,
        "status": "queued"
    }
