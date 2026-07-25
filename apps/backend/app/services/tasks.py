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
from ..models.models import Document, DetectedEntity, ProcessingQueue, AuditLog, DocumentEmbedding
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

def extract_raw_text_from_file(file_path: str, content_type: str) -> str:
    if not os.path.exists(file_path):
        return ""
    file_ext = os.path.splitext(file_path)[1].lower()
    try:
        if file_ext in [".txt", ".csv", ".json", ".log"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif file_ext == ".pdf" or content_type == "application/pdf":
            text = ""
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            return text
        elif file_ext == ".docx":
            doc = DocxDocument(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        else:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        logger.error(f"Failed to extract raw text from {file_path}: {e}")
        return ""

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
        
        with httpx.Client(timeout=120.0) as client:
            response = client.post(
                f"{settings.AI_SERVICE_URL}/api/v1/analyze",
                json=payload
            )
            
        if response.status_code != 200:
            raise Exception(f"AI Service returned status code {response.status_code}: {response.text}")
            
        result_data = response.json()
        entities = result_data.get("entities", [])
        
        # 3. Save Detected Entities to Database
        pii_count = 0
        for ent in entities:
            # Calibrate confidence score dynamically based on historic false positive reports
            calibrated_score = calibrate_confidence_sync(
                db=db,
                organization_id=doc.organization_id,
                entity_type=ent["entity_type"],
                text=ent["text"],
                raw_confidence=ent["confidence"]
            )
            
            # Generate explainability details (attribution + reason)
            exp = generate_explainability_metadata(
                entity_type=ent["entity_type"],
                text=ent["text"],
                confidence=calibrated_score
            )
            
            detected = DetectedEntity(
                document_id=doc.id,
                entity_type=ent["entity_type"],
                text=ent["text"],
                confidence=calibrated_score,
                start_char=ent["start_char"],
                end_char=ent["end_char"],
                page_number=ent["page_number"],
                bbox=json.dumps(ent["bbox"]),
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
                splitter = TextSplitter(chunk_size=500, chunk_overlap=100)
                chunks = splitter.split_text(raw_text)
                logger.info(f"Split document into {len(chunks)} chunks. Generating embeddings...")
                
                for idx, chunk in enumerate(chunks):
                    # Call async embedding generation via run_async
                    vector = run_async(generate_embedding(chunk))
                    
                    doc_emb = DocumentEmbedding(
                        document_id=doc.id,
                        chunk_index=idx,
                        text_content=chunk,
                        embedding=json.dumps(vector),
                        embedding_version=settings.EMBEDDING_PROVIDER
                    )
                    db.add(doc_emb)
                logger.info(f"Successfully generated and saved {len(chunks)} embeddings for document {doc.id}")
            else:
                logger.warning(f"No extractable text found in document {doc.id} for RAG indexing.")
        except Exception as embed_err:
            logger.error(f"RAG embedding indexing failed for document {doc.id}: {embed_err}")

        # 4. Finalize
        queue_item.status = "completed"
        queue_item.pii_found_count = pii_count
        queue_item.processing_time_ms = (time.time() - start_time) * 1000
        queue_item.completed_at = datetime.datetime.utcnow()
        
        doc.status = "completed"
        
        # Audit Log
        audit = AuditLog(
            user_id=doc.owner_id,
            organization_id=doc.organization_id,
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
        
        if queue_item:
            queue_item.status = "failed"
            queue_item.error_message = str(e)
            queue_item.completed_at = datetime.datetime.utcnow()
        if doc:
            doc.status = "failed"
            
        audit = AuditLog(
            user_id=doc.owner_id if doc else None,
            action="DOCUMENT_SCAN_FAILED",
            target=doc.original_name if doc else str(document_id),
            severity="high"
        )
        db.add(audit)
        db.commit()
        
    finally:
        db.close()
