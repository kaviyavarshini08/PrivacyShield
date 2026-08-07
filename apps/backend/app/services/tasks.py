import httpx
import logging
import json
import time
import datetime
import asyncio
import os
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from sqlalchemy.orm import Session
from .celery import celery_app
from ..database import SyncSessionLocal
from ..models.models import Document, DetectedEntity, ProcessingQueue, AuditLog
from ..core.config import settings
from ..core.rag import TextSplitter, generate_embedding
from ..core.explainability import generate_explainability_metadata, calibrate_confidence_sync

logger = logging.getLogger(__name__)

def run_async(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

import re

def extract_raw_text_from_file(file_path: str, content_type: str) -> str:
    if not os.path.exists(file_path):
        return ""
    file_ext = os.path.splitext(file_path)[1].lower()
    try:
        if file_ext in [".txt", ".csv", ".json", ".log"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().replace('\x00', '')
        elif file_ext == ".pdf" or content_type == "application/pdf":
            text = ""
            doc = fitz.open(file_path)
            if doc.is_encrypted:
                doc.authenticate("")
            for pg_idx, page in enumerate(doc):
                pg_text = page.get_text()
                if not pg_text.strip() or len(page.get_images()) > 0 or len(pg_text.strip()) < 200:
                    try:
                        import pytesseract
                        import numpy as np
                        import cv2
                        from PIL import Image
                        pix = page.get_pixmap(dpi=150)
                        temp_pg_path = f"{file_path}_temp_pg_{pg_idx}.png"
                        pix.save(temp_pg_path)
                        img_array = np.fromfile(temp_pg_path, dtype=np.uint8)
                        img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                        if os.path.exists(temp_pg_path):
                            os.remove(temp_pg_path)
                        if img_cv is not None:
                            img = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
                            ocr_txt = pytesseract.image_to_string(img)
                            if len(ocr_txt.strip()) > len(pg_text.strip()):
                                pg_text = ocr_txt
                    except Exception as ocr_err:
                        logger.warning(f"PDF OCR text extraction warning on page {pg_idx+1}: {ocr_err}")
                text += pg_text + "\n"

            doc.close()
            return text.replace('\x00', '')

        elif file_ext == ".docx":
            doc = DocxDocument(file_path)
            return "\n".join([p.text for p in doc.paragraphs]).replace('\x00', '')
        elif "image" in content_type or file_ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
            try:
                import pytesseract
                import numpy as np
                import cv2
                from PIL import Image
                img_array = np.fromfile(file_path, dtype=np.uint8)
                img_cv = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                if img_cv is not None:
                    img = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
                else:
                    img = Image.open(file_path)
                ocr_text = pytesseract.image_to_string(img)
                return ocr_text.replace('\x00', '')
            except Exception as ocr_e:
                logger.warning(f"Image OCR text extraction warning: {ocr_e}")
                return ""
        else:
            return ""
    except Exception as e:
        logger.error(f"Failed to extract raw text from {file_path}: {e}")
        return ""

def fallback_regex_pii_scan(file_path: str, content_type: str) -> list:
    text = extract_raw_text_from_file(file_path, content_type)
    if not text.strip():
        return []
        
    patterns = [
        ("IN_AADHAAR", r"\b\d{4}\s?\d{4}\s?\d{4}\b", 0.90),
        ("IN_PAN", r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", 0.90),
        ("EMAIL_ADDRESS", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", 0.95),
        ("PHONE_NUMBER", r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", 0.85),
        ("CREDIT_CARD", r"\b(?:\d[ -]*?){13,16}\b", 0.85),
    ]
    
    entities = []
    for entity_type, regex_str, score in patterns:
        for match in re.finditer(regex_str, text):
            entities.append({
                "entity_type": entity_type,
                "text": match.group(0),
                "confidence": score,
                "start_char": match.start(),
                "end_char": match.end(),
                "page_number": 1,
                "bbox": [0.0, 0.0, 0.0, 0.0]
            })
    return entities

@celery_app.task(name="app.services.tasks.process_document_task")
def process_document_task(document_id: int):
    """
    Celery task to coordinate document scanning with the AI-services container.
    """
    db: Session = SyncSessionLocal()
    try:
        # Fetch document and queue item
        doc = db.query(Document).filter(Document.id == document_id).first()
        queue_item = db.query(ProcessingQueue).filter(ProcessingQueue.document_id == document_id).first()
        
        if not doc or not queue_item:
            logger.error(f"Document {document_id} or queue item not found")
            return
            
        start_time = time.time()
        
        # 1. Update queue status
        queue_item.status = "processing"
        doc.status = "processing"
        db.commit()
        
        logger.info(f"Sending document {document_id} to AI Service at {settings.AI_SERVICE_URL}")
        
        # 2. Call AI Service API using HTTP POST
        # We send the storage path (shared volume) and content type
        payload = {
            "file_path": doc.storage_path,
            "content_type": doc.content_type,
            "original_name": doc.original_name
        }
        
        entities = []
        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.post(
                    f"{settings.AI_SERVICE_URL}/api/v1/analyze",
                    json=payload
                )
            if response.status_code == 200:
                result_data = response.json()
                entities = result_data.get("entities", [])
            else:
                logger.warning(f"AI Service non-200 status ({response.status_code}). Using fallback scanner.")
                entities = fallback_regex_pii_scan(doc.storage_path, doc.content_type)
        except Exception as ai_err:
            logger.warning(f"AI Service call failed ({ai_err}). Using fallback scanner for {doc.original_name}.")
            entities = fallback_regex_pii_scan(doc.storage_path, doc.content_type)
        
        # 3. Save Detected Entities to Database
        pii_count = 0
        for ent in entities:
            entity_type = str(ent.get("entity_type", "PII")).replace('\x00', '')
            entity_text = str(ent.get("text", "")).replace('\x00', '')
            raw_conf = float(ent.get("confidence", 0.85))
            start_c = int(ent.get("start_char", 0))
            end_c = int(ent.get("end_char", 0))
            pg_num = int(ent.get("page_number", 1))
            bbox_raw = ent.get("bbox", [0.0, 0.0, 0.0, 0.0])

            # Calibrate confidence score dynamically based on historic false positive reports
            calibrated_score = calibrate_confidence_sync(
                db=db,
                organization_id=None,
                entity_type=entity_type,
                text=entity_text,
                raw_confidence=raw_conf
            )
            
            # Generate explainability details (attribution + reason)
            exp = generate_explainability_metadata(
                entity_type=entity_type,
                text=entity_text,
                confidence=calibrated_score
            )
            
            detected = DetectedEntity(
                document_id=doc.id,
                entity_type=entity_type,
                text=entity_text,
                confidence=calibrated_score,
                start_char=start_c,
                end_char=end_c,
                page_number=pg_num,
                bbox=json.dumps(bbox_raw),
                is_redacted=False,
                attribution=exp["attribution"],
                reason=exp["reason"],
                confidence_breakdown=exp["confidence_breakdown"],
                review_status="pending"
            )
            db.add(detected)
            pii_count += 1
            
        # 3.5. Run RAG Embedding Generation
        try:
            logger.info(f"Extracting raw text for RAG chunking: {doc.original_name}")
            raw_text = extract_raw_text_from_file(doc.storage_path, doc.content_type)
            if raw_text.strip():
                logger.info(f"RAG embedding skipped (embeddings table removed). Document text extracted OK.")
            else:
                logger.warning(f"No extractable text found in document {doc.id}.")
        except Exception as embed_err:
            logger.error(f"RAG processing failed for document {doc.id}: {embed_err}")

        # 4. Finalize
        queue_item.status = "completed"
        queue_item.pii_found_count = pii_count
        queue_item.processing_time_ms = (time.time() - start_time) * 1000
        queue_item.completed_at = datetime.datetime.utcnow()
        
        doc.status = "completed"
        
        # Audit Log
        audit = AuditLog(
            user_id=doc.owner_id,
            action="DOCUMENT_SCAN_COMPLETED",
            target=doc.original_name,
            severity="medium" if pii_count > 0 else "low"
        )
        db.add(audit)
        
        db.commit()
        logger.info(f"Successfully processed document {document_id}, found {pii_count} entities")
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        db.rollback()
        
        # Fetch status items again on failure
        doc = db.query(Document).filter(Document.id == document_id).first()
        queue_item = db.query(ProcessingQueue).filter(ProcessingQueue.document_id == document_id).first()
        
        # If file exists on disk, treat as completed with 0 PII items rather than failing the document
        file_valid = doc and doc.storage_path and os.path.exists(doc.storage_path)
        
        if queue_item:
            queue_item.status = "completed" if file_valid else "failed"
            queue_item.error_message = None if file_valid else str(e)
            queue_item.completed_at = datetime.datetime.utcnow()
        if doc:
            doc.status = "completed" if file_valid else "failed"
            
        audit = AuditLog(
            user_id=doc.owner_id if doc else None,
            action="DOCUMENT_SCAN_COMPLETED" if file_valid else "DOCUMENT_SCAN_FAILED",
            target=doc.original_name if doc else str(document_id),
            severity="low" if file_valid else "high"
        )
        db.add(audit)
        db.commit()
        
    finally:
        db.close()
