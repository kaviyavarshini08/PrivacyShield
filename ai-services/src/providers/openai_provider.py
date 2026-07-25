import os
import json
import httpx
import logging
from .base import BasePIIProvider
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class OpenAIProvider(BasePIIProvider):
    """
    Optional external PII analysis provider querying OpenAI models (like gpt-4o-mini)
    to perform high-intelligence semantic identification of secrets and sensitive leaks.
    """
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.api_url = "https://api.openai.com/v1/chat/completions"

    def analyze(self, text: str, language: str = "en") -> List[Dict[str, Any]]:
        if not self.api_key or not text.strip():
            logger.info("OpenAI API key missing or empty text, bypassing OpenAI provider.")
            return []

        prompt = (
            "You are a cybersecurity scanner. Analyze the following text and locate all Personally Identifiable "
            "Information (PII) elements: Aadhaar card numbers, PAN cards, Passport numbers, Phone numbers, "
            "Emails, Credit Card numbers, Bank account details, Names, API Keys, or Password leaks.\n\n"
            "Return a JSON object containing a key 'entities' with a list of matches. Each match must contain "
            "'entity_type' (e.g. EMAIL_ADDRESS, IN_AADHAAR, IN_PAN, PERSON, LOCATION, API_KEY), 'text' (exact text snippet match), "
            "'start_char' (0-indexed start position character index), 'end_char' (0-indexed end position character index), "
            "and 'confidence' (float from 0.0 to 1.0).\n\n"
            "Text to scan:\n"
            f"\"\"\"\n{text}\n\"\"\""
        )

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a precise cybersecurity JSON extraction engine."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }

            with httpx.Client(timeout=30.0) as client:
                response = client.post(self.api_url, headers=headers, json=payload)
                
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                result_json = json.loads(content)
                entities = result_json.get("entities", [])
                
                # Verify coordinates schema
                validated_entities = []
                for ent in entities:
                    if all(k in ent for k in ["entity_type", "text", "start_char", "end_char", "confidence"]):
                        validated_entities.append(ent)
                return validated_entities
            else:
                logger.error(f"OpenAI PII extraction API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.exception(f"OpenAI PII analyzer provider failed: {e}")

        return []
