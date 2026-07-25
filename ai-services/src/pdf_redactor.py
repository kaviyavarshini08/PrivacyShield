import fitz
import logging

logger = logging.getLogger(__name__)

def redact_pdf(pdf_path: str, output_path: str, entities_to_redact: list) -> bool:
    """
    Applies solid vector redactions on a PDF file by deleting the actual underlying text stream
    within the bounding box coordinates, and scrubs metadata from headers.
    """
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        logger.error(f"Failed to open PDF file: {e}")
        raise ValueError(f"Could not load PDF: {str(e)}")
        
    try:
        for ent in entities_to_redact:
            page_num = ent["page_number"] - 1
            bbox = ent["bbox"]
            
            if page_num < 0 or page_num >= len(doc):
                continue
                
            if not bbox or sum(bbox) == 0:
                continue
                
            page = doc[page_num]
            rect = fitz.Rect(bbox)
            
            # Add redaction annotation (drawn as black box)
            # This marks the rectangle for removal
            page.add_redact_annot(rect, fill=(0, 0, 0))
            
        # Apply the redactions to erase the actual text characters from the streams
        for page in doc:
            page.apply_redactions()
            
        # Strip document metadata to prevent metadata information leaks
        empty_metadata = {
            "title": "",
            "author": "",
            "subject": "",
            "keywords": "",
            "creator": "",
            "producer": "",
            "creationDate": "",
            "modDate": ""
        }
        doc.set_metadata(empty_metadata)
        
        # Save redacted file with garbage collection and stream compression enabled
        doc.save(
            output_path,
            garbage=4,
            deflate=True,
            clean=True
        )
        doc.close()
        return True
        
    except Exception as e:
        logger.error(f"Failed to apply redactions to PDF: {e}")
        if 'doc' in locals() and not doc.is_closed:
            doc.close()
        raise e
