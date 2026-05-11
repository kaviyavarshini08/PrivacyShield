import json
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.models import Document, DetectedEntity, ProcessingQueue
import fitz  # PyMuPDF
from presidio_analyzer import AnalyzerEngine, RecognizerResult, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider

logger = logging.getLogger(__name__)

# Configure Presidio to use the small spacy model we will download
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()
analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

# Add Custom Recognizers for PAN and Aadhaar
aadhaar_pattern = Pattern(name="aadhaar_pattern", regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", score=0.85)
aadhaar_recognizer = PatternRecognizer(supported_entity="IN_AADHAAR", patterns=[aadhaar_pattern])
analyzer.registry.add_recognizer(aadhaar_recognizer)

pan_pattern = Pattern(name="pan_pattern", regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", score=0.85)
pan_recognizer = PatternRecognizer(supported_entity="IN_PAN", patterns=[pan_pattern])
analyzer.registry.add_recognizer(pan_recognizer)

def extract_text_with_bboxes(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Extract text and bounding boxes from PDF using PyMuPDF.
    Returns a list of pages, each containing the full text and a mapping of words to their bboxes.
    """
    try:
        doc = fitz.open(pdf_path)
    except fitz.FileDataError:
        raise ValueError("The uploaded file is not a valid or supported PDF.")
    except Exception as e:
        raise ValueError(f"Failed to open PDF: {str(e)}")
        
    pages_data = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # get_text("words") returns tuples: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
        words = page.get_text("words")
        
        # Reconstruct text while keeping track of character offsets to map back to bboxes
        full_text = ""
        word_mappings = []
        
        for w in words:
            rect = (w[0], w[1], w[2], w[3])
            word_text = w[4]
            
            start_idx = len(full_text)
            full_text += word_text + " "
            end_idx = len(full_text) - 1 # exclude trailing space
            
            word_mappings.append({
                "word": word_text,
                "start": start_idx,
                "end": end_idx,
                "bbox": rect
            })
            
        pages_data.append({
            "page_number": page_num + 1,
            "text": full_text,
            "word_mappings": word_mappings,
            "width": page.rect.width,
            "height": page.rect.height
        })
        
    return pages_data

def find_bounding_box_for_entity(start_char: int, end_char: int, word_mappings: List[Dict]) -> List[float]:
    """
    Given character offsets from Presidio, find the corresponding bounding box(es).
    Returns a single bounding box [x0, y0, x1, y1] encompassing the entity.
    """
    bboxes = []
    for mapping in word_mappings:
        # Check for overlap
        if max(start_char, mapping["start"]) <= min(end_char, mapping["end"]):
            bboxes.append(mapping["bbox"])
            
    if not bboxes:
        return [0, 0, 0, 0]
        
    # Calculate union of all bboxes
    x0 = min(b[0] for b in bboxes)
    y0 = min(b[1] for b in bboxes)
    x1 = max(b[2] for b in bboxes)
    y1 = max(b[3] for b in bboxes)
    
    return [x0, y0, x1, y1]

def process_document(document_id: int, db: Session):
    """
    Background task to analyze a document for PII.
    """
    try:
        # Fetch document and queue item
        doc = db.query(Document).filter(Document.id == document_id).first()
        queue_item = db.query(ProcessingQueue).filter(ProcessingQueue.document_id == document_id).first()
        
        if not doc or not queue_item:
            logger.error(f"Document {document_id} or queue item not found")
            return
            
        import time
        start_time = time.time()
        
        # 1. Update queue status
        queue_item.status = "Processing"
        db.commit()
        
        # 2. Extract text and bounding boxes
        pages_data = extract_text_with_bboxes(doc.storage_path)
        
        pii_count = 0
        
        # 3. Analyze text with Presidio
        for page_data in pages_data:
            text = page_data["text"]
            if not text.strip():
                continue
                
            results: List[RecognizerResult] = analyzer.analyze(
                text=text, 
                language="en",
                entities=["PHONE_NUMBER", "EMAIL_ADDRESS", "IN_PAN", "IN_AADHAAR", "PERSON", "LOCATION"]
            )
            
            for result in results:
                # Find bounding box
                bbox = find_bounding_box_for_entity(result.start, result.end, page_data["word_mappings"])
                
                # Create entity record
                entity = DetectedEntity(
                    document_id=doc.id,
                    entity_type=result.entity_type,
                    text=text[result.start:result.end],
                    confidence=result.score,
                    start_char=result.start,
                    end_char=result.end,
                    page_number=page_data["page_number"],
                    bbox=json.dumps(bbox),
                    is_redacted=False
                )
                db.add(entity)
                pii_count += 1
                
        # 4. Finalize
        queue_item.status = "Completed"
        queue_item.pii_found_count = pii_count
        queue_item.processing_time_ms = (time.time() - start_time) * 1000
        import datetime
        queue_item.completed_at = datetime.datetime.utcnow()
        doc.status = "completed"
        
        db.commit()
        logger.info(f"Successfully processed document {document_id}, found {pii_count} PII entities.")
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        if queue_item:
            queue_item.status = "Failed"
            queue_item.error_message = str(e)
            db.commit()
