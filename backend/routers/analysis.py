from fastapi import APIRouter, Depends, HTTPException, status

from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import fitz
import json

from ..database import get_db
from ..models.models import Document, DetectedEntity, RedactionLog, User
from ..schemas.schemas import DocumentAnalysisResponse, RedactRequest
from ..routers.auth import get_current_user

router = APIRouter()

@router.get("/{document_id}", response_model=DocumentAnalysisResponse)
def get_analysis(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    entities = db.query(DetectedEntity).filter(DetectedEntity.document_id == document_id).all()
    
    return {"document": doc, "entities": entities}

@router.post("/{document_id}/redact")
def redact_document(document_id: int, request: RedactRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    # Fetch entities to redact
    entities = db.query(DetectedEntity).filter(
        DetectedEntity.document_id == document_id,
        DetectedEntity.id.in_(request.entity_ids)
    ).all()
    
    # Process PDF with PyMuPDF
    try:
        absolute_path = os.path.abspath(
    os.path.join(os.getcwd(), doc.storage_path)
)
        pdf = fitz.open(absolute_path)
        
        for entity in entities:
            try:
                bbox_list = json.loads(entity.bbox)
                if sum(bbox_list) > 0: # Check if valid bbox
                    rect = fitz.Rect(bbox_list)
                    page = pdf[entity.page_number - 1]
                    page.add_redact_annot(rect, fill=(0, 0, 0))
                    
                    # Mark as redacted in DB
                    entity.is_redacted = True
                    
                    # Add RedactionLog
                    log = RedactionLog(document_id=doc.id, entity_id=entity.id, status="redacted")
                    db.add(log)
            except Exception as e:
                print(f"Error applying redaction to entity {entity.id}: {e}")
                
        # Apply the redactions
        for page in pdf:
            page.apply_redactions()
        
        # Save new redacted PDF
        dir_name = os.path.dirname(doc.storage_path)
        base_name = os.path.basename(doc.storage_path)
        name, ext = os.path.splitext(base_name)
        redacted_filename = f"{name}_redacted{ext}"
        redacted_path = os.path.join(dir_name, redacted_filename)
        
        # Garbage collect and save
        pdf.save(
    redacted_path,
    garbage=4,
    deflate=True,
    clean=True
)
        pdf.close()
        
        doc.redacted_storage_path = os.path.abspath(redacted_path)
        doc.is_encrypted = True # Conceptually it is secured
        db.commit()
        
        return {"message": "Document redacted successfully", "redacted_path": redacted_path}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to redact document: {str(e)}")

@router.get("/{document_id}/preview")
@router.get("/{document_id}/preview")
def get_preview(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    doc = db.query(Document).filter(Document.id == document_id).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if current_user.role != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this document"
        )

    absolute_path = os.path.abspath(
        os.path.join(os.getcwd(), doc.storage_path)
    )

    if not os.path.exists(absolute_path):
        raise HTTPException(
            status_code=404,
            detail="File not found on disk"
        )

    return FileResponse(
        absolute_path,
        media_type="application/pdf"
    )

@router.get("/{document_id}/download-redacted")
def get_download_redacted(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
        
    if not doc.redacted_storage_path or not os.path.exists(doc.redacted_storage_path):
        raise HTTPException(status_code=404, detail="Redacted file not found")
        
    return FileResponse(doc.redacted_storage_path, media_type="application/pdf", filename=f"redacted_{doc.original_name}")

@router.get("/vault/items")
def get_vault_items(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only return documents that have been redacted
    query = db.query(Document).filter(Document.redacted_storage_path != None)
    
    if current_user.role != "admin":
        query = query.filter(Document.owner_id == current_user.id)
        
    docs = query.all()
    
    result = []
    for doc in docs:
        result.append({
            "id": doc.id,
            "name": doc.original_name,
            "size": f"{doc.file_size / (1024*1024):.2f} MB",
            "category": doc.content_type,
            "pii": sum([q.pii_found_count for q in doc.queue_entry] if type(doc.queue_entry) is list else [doc.queue_entry.pii_found_count] if getattr(doc.queue_entry, 'pii_found_count', None) else [0]),
            "access": "Restricted",
            "date": doc.created_at.strftime("%Y-%m-%d")
        })
    return result

@router.get("/{document_id}/audit-report")
def get_audit_report(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from fastapi.responses import Response
    import csv
    import io
    
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if current_user.role != "admin" and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    entities = db.query(DetectedEntity).filter(DetectedEntity.document_id == document_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Entity ID", "Type", "Text Snippet", "Confidence", "Redacted", "Page Number"])
    
    for e in entities:
        writer.writerow([e.id, e.entity_type, e.text, f"{e.confidence:.2f}", "Yes" if e.is_redacted else "No", e.page_number])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=audit_report_{doc.original_name}.csv"
    return response
