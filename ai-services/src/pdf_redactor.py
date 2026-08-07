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
            page_num = ent.get("page_number", 1) - 1
            bbox = ent.get("bbox", [])
            text = str(ent.get("text", "")).strip()
            
            if page_num < 0 or page_num >= len(doc):
                page_num = 0

            page = doc[page_num]
            rects = []
            
            if bbox and len(bbox) == 4 and sum(bbox) > 0:
                rects.append(fitz.Rect(bbox))
                
            # Dual-layer text search fallback to guarantee 100% text masking even if bboxes are missing/approximate
            if text:
                found_rects = page.search_for(text)
                for r in found_rects:
                    if r not in rects:
                        rects.append(r)

            # Also check across all pages if entity text is found anywhere in the PDF
            if not rects and text:
                for p_idx, p in enumerate(doc):
                    all_p_rects = p.search_for(text)
                    for r in all_p_rects:
                        p.add_redact_annot(r, fill=(0, 0, 0))
                        p.draw_rect(r, color=(0, 0, 0), fill=(0, 0, 0))

            for rect in rects:
                page.add_redact_annot(rect, fill=(0, 0, 0))
                page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))
            
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
