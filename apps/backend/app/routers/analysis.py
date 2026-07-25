from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from pydantic import BaseModel
import os
import json
import httpx
import csv
import io
import logging

from ..database import get_db
from ..models.models import Document, DetectedEntity, RedactionLog, User, AuditLog, FalsePositiveLog
from ..core.tenant import tenant_select
from ..schemas.schemas import DocumentAnalysisResponse, RedactRequest
from ..core.security import get_current_user, RoleChecker
from ..core.rbac import Permission, PermissionChecker
from ..core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{document_id}", response_model=DocumentAnalysisResponse)
async def get_analysis(
    document_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    stmt = tenant_select(Document).filter(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    entity_stmt = select(DetectedEntity).filter(DetectedEntity.document_id == document_id)
    entity_result = await db.execute(entity_stmt)
    entities = entity_result.scalars().all()
    
    return {"document": doc, "entities": entities}

@router.post("/{document_id}/redact")
async def redact_document(
    document_id: int, 
    request: RedactRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    stmt = tenant_select(Document).filter(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to redact this document")
        
    # Fetch entities to redact
    entity_stmt = select(DetectedEntity).filter(
        DetectedEntity.document_id == document_id,
        DetectedEntity.id.in_(request.entity_ids)
    )
    entity_result = await db.execute(entity_stmt)
    entities = entity_result.scalars().all()
    
    if not entities:
        raise HTTPException(status_code=400, detail="No valid entity IDs provided for redaction.")

    # Prepare payload for AI-service redaction
    # We pass coordinates, page numbers, text, and original document type
    # So the AI service can choose between PDF-redact, Image-redact, or Text-redact
    entities_data = []
    for entity in entities:
        try:
            bbox_list = json.loads(entity.bbox)
        except Exception:
            bbox_list = [0, 0, 0, 0]
            
        entities_data.append({
            "id": entity.id,
            "entity_type": entity.entity_type,
            "text": entity.text,
            "page_number": entity.page_number,
            "bbox": bbox_list,
            "start_char": entity.start_char,
            "end_char": entity.end_char
        })
        
    dir_name = os.path.dirname(doc.storage_path)
    base_name = os.path.basename(doc.storage_path)
    name, ext = os.path.splitext(base_name)
    redacted_filename = f"{name}_redacted{ext}"
    redacted_path = os.path.abspath(os.path.join(dir_name, redacted_filename))
    
    payload = {
        "file_path": doc.storage_path,
        "content_type": doc.content_type,
        "output_path": redacted_path,
        "entities": entities_data
    }
    
    try:
        # Call AI-services container to perform the actual redact/blur action
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.AI_SERVICE_URL}/api/v1/redact",
                json=payload
            )
            
        if response.status_code != 200:
            raise Exception(f"AI Redaction service returned {response.status_code}: {response.text}")
            
        # Update entity redaction states in database
        for entity in entities:
            entity.is_redacted = True
            log = RedactionLog(document_id=doc.id, entity_id=entity.id, status="redacted")
            db.add(log)
            
        doc.redacted_storage_path = redacted_path
        doc.is_encrypted = True
        
        # Log Audit Action
        audit = AuditLog(
            user_id=current_user.id,
            action="DOCUMENT_REDACTED",
            target=doc.original_name,
            severity="medium"
        )
        db.add(audit)
        
        await db.commit()
        
        return {"message": "Document redacted successfully", "redacted_path": redacted_path}
        
    except Exception as e:
        logger.error(f"Redaction failed for document {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to redact document: {str(e)}"
        )

@router.get("/{document_id}/preview")
async def get_preview(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = tenant_select(Document).filter(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="File not found on storage")
        
    return FileResponse(doc.storage_path, media_type=doc.content_type)

@router.get("/{document_id}/download-redacted")
async def get_download_redacted(
    document_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    stmt = tenant_select(Document).filter(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not doc.redacted_storage_path or not os.path.exists(doc.redacted_storage_path):
        raise HTTPException(status_code=404, detail="Redacted file not found")
        
    return FileResponse(
        doc.redacted_storage_path, 
        media_type=doc.content_type, 
        filename=f"redacted_{doc.original_name}"
    )

@router.get("/vault/items")
async def get_vault_items(
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    stmt = (
        tenant_select(Document)
        .filter(Document.redacted_storage_path != None)
        .options(selectinload(Document.queue_entry))
    )
    
    if current_user.role not in ["admin", "manager", "analyst"]:
        stmt = stmt.filter(Document.owner_id == current_user.id)
        
    result = await db.execute(stmt)
    docs = result.scalars().all()
    
    vault_items = []
    for doc in docs:
        pii_count = doc.queue_entry.pii_found_count if doc.queue_entry else 0
        vault_items.append({
            "id": doc.id,
            "name": doc.original_name,
            "size": f"{doc.file_size / (1024*1024):.2f} MB",
            "category": doc.content_type,
            "pii": pii_count,
            "access": "Restricted",
            "date": doc.created_at.strftime("%Y-%m-%d")
        })
    return vault_items

@router.get("/{document_id}/audit-report")
async def get_audit_report(
    document_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    stmt = tenant_select(Document).filter(Document.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role not in ["admin", "manager", "analyst"] and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    entity_stmt = select(DetectedEntity).filter(DetectedEntity.document_id == document_id)
    entity_result = await db.execute(entity_stmt)
    entities = entity_result.scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Entity ID", "Type", "Text Snippet", "Confidence", "Redacted", "Page Number"])
    
    for e in entities:
        writer.writerow([e.id, e.entity_type, e.text, f"{e.confidence:.2f}", "Yes" if e.is_redacted else "No", e.page_number])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=audit_report_{doc.original_name}.csv"
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="AUDIT_REPORT_EXPORTED",
        target=doc.original_name,
        severity="low"
    )
    db.add(audit)
    await db.commit()
    
    return response

class CorrectEntityRequest(BaseModel):
    corrected_text: str
    corrected_type: str

@router.get("/review/queue")
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.AI_FEEDBACK_REVIEW))
):
    """
    Fetches all pending PII detections within the organization for analyst review.
    """
    stmt = (
        select(DetectedEntity)
        .join(Document, Document.id == DetectedEntity.document_id)
        .filter(
            Document.organization_id == current_user.organization_id,
            DetectedEntity.review_status == "pending"
        )
    )
    res = await db.execute(stmt)
    entities = res.scalars().all()
    return entities

@router.post("/review/{entity_id}/approve")
async def approve_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.AI_FEEDBACK_REVIEW))
):
    """
    Approves a PII detection.
    """
    stmt = (
        select(DetectedEntity)
        .join(Document, Document.id == DetectedEntity.document_id)
        .filter(
            DetectedEntity.id == entity_id,
            Document.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(stmt)
    entity = res.scalars().first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found or belongs to another tenant.")

    entity.review_status = "approved"
    db.add(entity)
    await db.commit()
    return {"status": "success", "message": "PII detection approved."}

@router.post("/review/{entity_id}/reject")
async def reject_entity(
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.AI_FEEDBACK_REVIEW))
):
    """
    Rejects a detection (marks it as a false positive), registering it in FalsePositiveLog.
    """
    stmt = (
        select(DetectedEntity)
        .join(Document, Document.id == DetectedEntity.document_id)
        .filter(
            DetectedEntity.id == entity_id,
            Document.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(stmt)
    entity = res.scalars().first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found or belongs to another tenant.")

    entity.review_status = "rejected"
    
    # Save False Positive log to tune confidence dynamically
    fp_log = FalsePositiveLog(
        organization_id=current_user.organization_id,
        entity_type=entity.entity_type,
        text=entity.text,
        context_words=None
    )
    db.add(fp_log)
    db.add(entity)
    await db.commit()
    return {"status": "success", "message": "PII detection flagged as false positive."}

@router.post("/review/{entity_id}/correct")
async def correct_entity(
    entity_id: int,
    req: CorrectEntityRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker(Permission.AI_FEEDBACK_REVIEW))
):
    """
    Corrects a PII detection (user custom text/type correction).
    """
    stmt = (
        select(DetectedEntity)
        .join(Document, Document.id == DetectedEntity.document_id)
        .filter(
            DetectedEntity.id == entity_id,
            Document.organization_id == current_user.organization_id
        )
    )
    res = await db.execute(stmt)
    entity = res.scalars().first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found or belongs to another tenant.")

    # Record correction in False Positive Log (representing previous type was wrong)
    fp_log = FalsePositiveLog(
        organization_id=current_user.organization_id,
        entity_type=entity.entity_type,
        text=entity.text,
        corrected_type=req.corrected_type
    )
    db.add(fp_log)

    entity.review_status = "corrected"
    entity.corrected_text = req.corrected_text
    entity.entity_type = req.corrected_type
    entity.attribution = "user_corrected"
    
    db.add(entity)
    await db.commit()
    return {"status": "success", "message": "PII detection corrected."}

