import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

def calibrate_confidence(
    entity_type: str, 
    text: str, 
    raw_confidence: float, 
    false_positives: List[Dict[str, Any]]
) -> float:
    """
    Applies calibration to confidence scores. If the exact text has been marked
    as a false positive in the past, it scales down the confidence score.
    """
    calibration_factor = 1.0
    
    # Scan historical false positive logs
    for fp in false_positives:
        if fp.get("entity_type") == entity_type and fp.get("text").lower() == text.lower():
            # Reduce confidence score by 25% for each previous false positive occurrence, min 0.1
            calibration_factor -= 0.25
            
    calibrated_score = max(0.1, raw_confidence * calibration_factor)
    return round(calibrated_score, 3)

def generate_explainability_metadata(
    entity_type: str, 
    text: str, 
    confidence: float
) -> Dict[str, Any]:
    """
    Generates explainability metadata outlining the source of detection (regex vs AI),
    reasons, and score breakdowns.
    """
    regex_entities = ["IN_AADHAAR", "IN_PAN", "PASSPORT", "API_KEY", "EMAIL_ADDRESS", "CREDIT_CARD"]
    
    is_regex = entity_type in regex_entities
    attribution = "regex" if is_regex else "ai"
    
    reasons = {
        "IN_AADHAAR": "Matched Aadhaar identifier pattern (12 digits sequence).",
        "IN_PAN": "Matched Indian Income Tax PAN identifier pattern rules (5 letters, 4 digits, 1 letter).",
        "PASSPORT": "Matched national passport alphanumeric sequence format.",
        "API_KEY": "Detected high-entropy private key, client secret, or token signature.",
        "PHONE_NUMBER": "Detected structured mobile or telephone dial-code pattern.",
        "EMAIL_ADDRESS": "Matched standard internet email format parser.",
        "CREDIT_CARD": "Detected credit card payment account pattern matching Luhn algorithm checks.",
        "PERSON": "Identified name of a person using NLP named entity recognition (NER) model.",
        "LOCATION": "Identified geographical site or location entity using NLP token classifications."
    }
    
    reason = reasons.get(entity_type, f"Identified sensitive {entity_type} element via AI models.")
    
    confidence_breakdown = {
        "raw_score": confidence,
        "detector_type": "pattern_match" if is_regex else "nlp_ner_model",
        "regex_validated": is_regex,
        "context_rules_applied": True if confidence > 0.8 else False
    }
    
    return {
        "attribution": attribution,
        "reason": reason,
        "confidence_breakdown": confidence_breakdown
    }
