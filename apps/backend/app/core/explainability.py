import json
from typing import Dict, Any

def generate_explainability_metadata(entity_type: str, text: str, confidence: float) -> Dict[str, Any]:
    """
    Compiles attribution type, reasons, and JSON confidence score breakdowns.
    """
    regex_entities = ["IN_AADHAAR", "IN_PAN", "PASSPORT", "API_KEY", "EMAIL_ADDRESS", "CREDIT_CARD"]
    is_regex = entity_type in regex_entities
    attribution = "regex" if is_regex else "ai"
    
    reasons = {
        "IN_AADHAAR": "Matched Indian national Aadhaar identifier pattern check (12-digit spaced sequence).",
        "IN_PAN": "Matched Indian Income Tax PAN identifier pattern rules.",
        "PASSPORT": "Matched standard national passport number formats.",
        "API_KEY": "Detected high-entropy private key, auth token, or API secret parameter signature.",
        "PHONE_NUMBER": "Detected structured telephone number sequence in context.",
        "EMAIL_ADDRESS": "Detected standard internet email domain routing format.",
        "PERSON": "Identified name of a person using NLP named entity recognition (NER) model.",
        "LOCATION": "Identified geographical address or location reference.",
        "CREDIT_CARD": "Detected credit card payment primary account number signature."
    }
    
    reason = reasons.get(entity_type, f"Identified sensitive {entity_type} entity using predictive models.")
    
    confidence_breakdown = {
        "raw_score": confidence,
        "detector_type": "pattern_match" if is_regex else "nlp_ner_model",
        "regex_validated": is_regex,
        "context_rules_applied": True if confidence > 0.8 else False
    }
    
    return {
        "attribution": attribution,
        "reason": reason,
        "confidence_breakdown": json.dumps(confidence_breakdown)
    }

def calibrate_confidence_sync(
    db, 
    organization_id: int, 
    entity_type: str, 
    text: str, 
    raw_confidence: float
) -> float:
    """
    Returns raw confidence score (false positive tracking removed).
    """
    return raw_confidence
