from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import os

from ..database import get_db
from ..models.models import Document, ProcessingQueue, User, AuditLog
from ..services.storage import storage_service
from ..core.security import get_current_user
from ..services.tasks import process_document_task

router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    allowed_types = [
        "application/pdf", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "text/plain",
        "image/png",
        "image/jpeg",
        "text/csv",
        "application/zip",
        "application/x-zip-compressed"
    ]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file.content_type not in allowed_types and file_ext not in ['.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.csv', '.zip']:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Supported types: PDF, DOCX, TXT, PNG, JPG, CSV, ZIP."
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

    # 1. Enforce tenant upload storage quota check
    from ..core.tenant import verify_tenant_upload_quota
    tenant_id = current_user.organization_id
    if tenant_id:
        await verify_tenant_upload_quota(db, tenant_id, file_size)

    # 2. Check for MIME spoofing
    from ..services.security_scanner import verify_file_mime_header, scan_for_malware, quarantine_file
    if not verify_file_mime_header(file_path, file.content_type):
        quarantine_file(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security Violation: File headers do not match declared extension."
        )

    # 3. Scan for malware
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
            organization_id=tenant_id,
            status="failed"
        )
        db.add(new_doc)
        audit_log = AuditLog(
            user_id=current_user.id,
            action="MALWARE_DETECTED",
            target=file.filename,
            severity="high",
            organization_id=tenant_id
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
        organization_id=tenant_id,
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
        severity="low",
        organization_id=tenant_id
    )
    db.add(audit_log)
    
    await db.commit()

    # Trigger Async Background Processing via Celery
    process_document_task.delay(new_doc.id)

    return {
        "message": "Document uploaded successfully", 
        "document_id": new_doc.id,
        "status": "queued"
    }
