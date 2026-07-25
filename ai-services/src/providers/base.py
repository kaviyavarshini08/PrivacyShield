from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BasePIIProvider(ABC):
    """
    Abstract base class representing a pluggable PII detection engine.
    """
    @abstractmethod
    def analyze(self, text: str, language: str = "en") -> List[Dict[str, Any]]:
        """
        Analyzes the text for PII leaks.
        Returns a list of dicts:
        {
            "entity_type": "EMAIL_ADDRESS",
            "text": "user@example.com",
            "start_char": 0,
            "end_char": 16,
            "confidence": 0.95
        }
        """
        pass
