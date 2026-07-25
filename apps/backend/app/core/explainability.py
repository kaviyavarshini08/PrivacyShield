import json
from typing import Dict, Any
from sqlalchemy.orm import Session
from ..models.models import FalsePositiveLog

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
    db: Session, 
    organization_id: int, 
    entity_type: str, 
    text: str, 
    raw_confidence: float
) -> float:
    """
    Calibrates confidence scores based on previous false positive logs for this organization.
    """
    if not organization_id:
        return raw_confidence

    try:
        # Check matching false positive records
        count = db.query(FalsePositiveLog).filter(
            FalsePositiveLog.organization_id == organization_id,
            FalsePositiveLog.entity_type == entity_type,
            FalsePositiveLog.text == text
        ).count()
        
        if count > 0:
            # Drop confidence score by 20% per event, min 0.1
            scale = max(0.1, 1.0 - (count * 0.2))
            return round(raw_confidence * scale, 3)
    except Exception:
        pass
        
    return raw_confidence
