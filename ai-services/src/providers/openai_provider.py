import os
import json
import re
import logging
from .base import BasePIIProvider
from .presidio import PresidioProvider
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class OpenAIProvider(BasePIIProvider):
    """
    100% Local Self-Contained PII analysis provider.
    Replaces external OpenAI API dependencies with local Presidio NLP and 
    high-entropy pattern matching for secrets, passwords, and PII.
    """
    def __init__(self):
        self.presidio = PresidioProvider()

    def analyze(self, text: str, language: str = "en") -> List[Dict[str, Any]]:
        if not text or not text.strip():
            return []

        logger.info("Running local offline PII and security scanner...")
        entities = []

        # 1. Run local Presidio NLP analyzer
        try:
            entities = self.presidio.analyze(text, language)
        except Exception as e:
            logger.warning(f"Local Presidio analyzer step warning: {e}")

        # 2. Local high-entropy and regional PII regex patterns
        patterns = [
            ("IN_AADHAAR", r"\b\d{4}\s?\d{4}\s?\d{4}\b", 0.95),
            ("IN_PAN", r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", 0.95),
            ("EMAIL_ADDRESS", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", 0.98),
            ("PHONE_NUMBER", r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", 0.90),
            ("CREDIT_CARD", r"\b(?:\d[ -]*?){13,16}\b", 0.92),
            ("API_KEY", r"\b(?:sk_[a-zA-Z0-9]{24,32}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})\b", 0.99),
            ("SECRET_LEAK", r"\b(?:password|passwd|secret_key|api_secret)\s*=\s*['\"][^'\"]+['\"]\b", 0.95),
        ]

        existing_spans = {(e["start_char"], e["end_char"]) for e in entities}

        for entity_type, regex_str, conf in patterns:
            for match in re.finditer(regex_str, text, re.IGNORECASE):
                start, end = match.start(), match.end()
                if (start, end) not in existing_spans:
                    entities.append({
                        "entity_type": entity_type,
                        "text": match.group(0),
                        "start_char": start,
                        "end_char": end,
                        "confidence": conf
                    })
                    existing_spans.add((start, end))

        return entities

