import os
import logging
from .base import BasePIIProvider
from .presidio import PresidioProvider
from .openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

class PIIProviderManager:
    """
    Registry that selects and instantiates the active PII analyzer provider based on environment variables.
    """
    def __init__(self):
        self.provider_name = os.getenv("ACTIVE_PII_PROVIDER", "presidio").lower()
        self._provider = None

    def get_provider(self) -> BasePIIProvider:
        if self._provider is not None:
            return self._provider
            
        logger.info(f"Initializing active PII scanner provider: {self.provider_name}")
        
        if self.provider_name == "openai":
            self._provider = OpenAIProvider()
        else:
            # Fallback to default local Presidio engine
            self._provider = PresidioProvider()
            
        return self._provider

# Shared provider manager instance
provider_manager = PIIProviderManager()
