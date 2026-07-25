import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

def redact_image(image_path: str, output_path: str, bboxes: list, mode: str = "blur") -> bool:
    """
    Applies redacting overlays (solid boxes or Gaussian blurs) on PII regions of an image.
    """
    img = cv2.imread(image_path)
    if img is None:
        logger.error(f"OpenCV failed to read image at {image_path}")
        raise ValueError(f"Could not load image from {image_path}")
        
    h, w, _ = img.shape
    
    for bbox in bboxes:
        if not bbox or sum(bbox) == 0:
            continue
            
        # Coordinates parsing [x0, y0, x1, y1]
        x0, y0, x1, y1 = [int(round(coord)) for coord in bbox]
        
        # Enforce bounds checks
        x0, x1 = max(0, min(x0, w)), max(0, min(x1, w))
        y0, y1 = max(0, min(y0, h)), max(0, min(y1, h))
        
        if x1 <= x0 or y1 <= y0:
            continue
            
        if mode == "blur":
            try:
                roi = img[y0:y1, x0:x1]
                # Bounded odd dimensions for Gaussian kernel size
                kw = (x1 - x0) | 1
                kh = (y1 - y0) | 1
                kw = max(19, min(kw, 75))
                kh = max(19, min(kh, 75))
                
                blurred = cv2.GaussianBlur(roi, (kw, kh), 0)
                img[y0:y1, x0:x1] = blurred
            except Exception as e:
                logger.error(f"Error blurring region {bbox}: {e}")
                # Fallback to solid rectangle overlay if blur fails
                cv2.rectangle(img, (x0, y0), (x1, y1), (0, 0, 0), -1)
        else:
            # Solid black rectangle overlay
            cv2.rectangle(img, (x0, y0), (x1, y1), (0, 0, 0), -1)
            
    cv2.imwrite(output_path, img)
    return True
