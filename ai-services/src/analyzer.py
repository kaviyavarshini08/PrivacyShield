from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
import logging

logger = logging.getLogger(__name__)

# Configure Presidio with spaCy NLP engine
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
}

try:
    provider = NlpEngineProvider(nlp_configuration=configuration)
    nlp_engine = provider.create_engine()
    analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])
except Exception as e:
    logger.error(f"Failed to load spaCy NLP engine: {e}. Falling back to default analyzer.")
    analyzer = AnalyzerEngine()

# Custom Recognizers definitions
# 1. Aadhaar Card Pattern: 12 digits (often spaced in groups of 4)
aadhaar_pattern = Pattern(
    name="aadhaar_pattern", 
    regex=r"\b\d{4}\s?\d{4}\s?\d{4}\b", 
    score=0.85
)
aadhaar_recognizer = PatternRecognizer(
    supported_entity="IN_AADHAAR", 
    patterns=[aadhaar_pattern]
)
analyzer.registry.add_recognizer(aadhaar_recognizer)

# 2. PAN Card Pattern: 5 letters, 4 digits, 1 letter
pan_pattern = Pattern(
    name="pan_pattern", 
    regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b", 
    score=0.85
)
pan_recognizer = PatternRecognizer(
    supported_entity="IN_PAN", 
    patterns=[pan_pattern]
)
analyzer.registry.add_recognizer(pan_recognizer)

# 3. Indian Passport Pattern: 1 letter followed by 7 digits
passport_pattern = Pattern(
    name="indian_passport_pattern", 
    regex=r"\b[A-Z]{1}[0-9]{7}\b", 
    score=0.85
)
passport_recognizer = PatternRecognizer(
    supported_entity="PASSPORT", 
    patterns=[passport_pattern]
)
analyzer.registry.add_recognizer(passport_recognizer)

# 4. API Keys Pattern (Generic High Entropy Secrets)
api_key_pattern = Pattern(
    name="api_key_pattern",
    regex=r"\b(api_key|client_secret|private_key|token)[\s:=']{1,5}[a-zA-Z0-9_\-\.\~]{24,64}\b",
    score=0.80
)
api_key_recognizer = PatternRecognizer(
    supported_entity="API_KEY",
    patterns=[api_key_pattern]
)
analyzer.registry.add_recognizer(api_key_recognizer)

def analyze_text(text: str, language: str = "en") -> list:
    """
    Analyzes a text string for PII and sensitive data elements.
    Returns a list of Presidio RecognizerResult converted into serializable dictionaries.
    """
    if not text.strip():
        return []
        
    results = analyzer.analyze(
        text=text,
        language=language,
        entities=[
            "PHONE_NUMBER", "EMAIL_ADDRESS", "IN_PAN", "IN_AADHAAR", 
            "PERSON", "LOCATION", "CREDIT_CARD", "PASSPORT", "API_KEY"
        ]
    )
    
    serialized = []
    for r in results:
        serialized.append({
            "entity_type": r.entity_type,
            "start_char": r.start,
            "end_char": r.end,
            "text": text[r.start:r.end],
            "confidence": r.score,
            # Bounding box defaults to empty, to be populated if text has block positions
            "bbox": [0, 0, 0, 0],
            "page_number": 1
        })
        
    return serialized
