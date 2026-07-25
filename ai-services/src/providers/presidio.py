from .base import BasePIIProvider
from ..analyzer import analyze_text
from typing import List, Dict, Any

class PresidioProvider(BasePIIProvider):
    """
    Local PII analysis provider powered by Microsoft Presidio and spaCy.
    """
    def analyze(self, text: str, language: str = "en") -> List[Dict[str, Any]]:
        # Forward directly to our custom configured presidio analyzer sweeps
        return analyze_text(text, language=language)
