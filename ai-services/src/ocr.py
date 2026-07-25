import pytesseract
from PIL import Image
import os
import logging

logger = logging.getLogger(__name__)

# Try setting local tesseract path for windows environments if needed
# We prioritize default system path which is set up automatically in the Docker containers
# If running locally on Windows outside docker, the user can override TESSERACT_CMD env var
tesseract_cmd = os.getenv("TESSERACT_CMD")
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

import cv2
from PIL import Image

def perform_ocr(image_path: str):
    """
    Performs OCR on an image and returns:
    1. Reconstructed full text string.
    2. List of word mappings, containing the word, character offsets, and bounding boxes.
    """
    try:
        # Load using OpenCV to enable computer vision filtering
        img_cv = cv2.imread(image_path)
        if img_cv is None:
            raise Exception("OpenCV read returned None")
            
        # CV Preprocessing: grayscale -> median blur -> otsu threshold
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        denoised = cv2.medianBlur(gray, 3)
        processed_np = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        
        # Convert preprocessed numpy array back to PIL Image
        img = Image.fromarray(processed_np)
    except Exception as e:
        logger.error(f"Failed to pre-process image file for OCR: {e}. Falling back to default loader.")
        try:
            img = Image.open(image_path)
        except Exception as load_err:
            raise ValueError(f"Could not load image file: {str(load_err)}")
        
    try:
        # pytesseract.image_to_data returns detailed positions of each word
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    except Exception as e:
        logger.error(f"Tesseract OCR failed: {e}. Ensure Tesseract-OCR is installed on the host/container.")
        # Fallback empty scan
        return "", []
        
    n_boxes = len(data['text'])
    full_text = ""
    word_mappings = []
    
    for i in range(n_boxes):
        conf = data['conf'][i]
        text_val = data['text'][i]
        
        # Keep valid text boxes
        if conf is not None and int(conf) > 0 and text_val.strip():
            word = text_val.strip()
            x = data['left'][i]
            y = data['top'][i]
            w = data['width'][i]
            h = data['height'][i]
            
            start_idx = len(full_text)
            full_text += word + " "
            end_idx = len(full_text) - 1 # exclude trailing space
            
            word_mappings.append({
                "word": word,
                "start": start_idx,
                "end": end_idx,
                # Convert (x,y,w,h) to standard [x0, y0, x1, y1] coordinates
                "bbox": [float(x), float(y), float(x + w), float(y + h)]
            })
            
    return full_text, word_mappings
