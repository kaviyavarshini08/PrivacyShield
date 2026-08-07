import os
import logging
from .base import BasePIIProvider
from .presidio import PresidioProvider
from .openai_provider import OpenAIProvider

logger = logging.getLogger(__name__)

class PIIProviderManager:
    """
    Registry that selects and instantiates the active local PII analyzer provider.
    """
    def __init__(self):
        self._provider = OpenAIProvider()

    def get_provider(self) -> BasePIIProvider:
        return self._provider


# Shared provider manager instance
provider_manager = PIIProviderManager()
