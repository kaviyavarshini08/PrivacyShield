import logging
import json
import uuid
from datetime import datetime
from contextvars import ContextVar

# ContextVar to track Correlation ID across async requests
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")

class JSONFormatter(logging.Formatter):
    """
    Serializes standard log records into structured JSON format for Prometheus/Loki ingestion.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "filename": record.filename,
            "line_number": record.lineno,
            "correlation_id": correlation_id_ctx.get()
        }
        
        # Format exceptions if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

def setup_logging():
    """
    Overrides the default logging handlers with the structured JSON formatter.
    """
    root_logger = logging.getLogger()
    
    # Clean up existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
    root_logger.setLevel(logging.INFO)
    
    # Force uvicorn logging to use JSON formatter as well
    for log_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logger = logging.getLogger(log_name)
        logger.handlers = []
        logger.propagate = True
