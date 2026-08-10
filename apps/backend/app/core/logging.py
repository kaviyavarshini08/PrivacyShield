import logging
import json
from datetime import datetime
from contextvars import ContextVar

# ContextVar to track Correlation ID across async requests
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")


class JSONFormatter(logging.Formatter):
    """
    Structured JSON formatter — used only for application-level loggers (not uvicorn).
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
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


def setup_logging():
    """
    Sets up logging so that:
    - All uvicorn loggers (access + error) keep their native colored terminal output
    - Application-level loggers use structured JSON for Prometheus/Loki
    """
    # --- Uvicorn loggers: leave completely alone so they show colored access logs ---
    for log_name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        uv_logger = logging.getLogger(log_name)
        uv_logger.handlers = []
        uv_logger.propagate = False  # prevent from reaching root/JSON handler

    # Re-attach uvicorn's own default colored handler
    import uvicorn.config
    log_config = uvicorn.config.LOGGING_CONFIG
    logging.config.dictConfig(log_config)

    # --- Root / app-level logger: JSON structured ---
    root_logger = logging.getLogger()
    # Remove any handlers set by dictConfig on root
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    json_handler = logging.StreamHandler()
    json_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(json_handler)
    root_logger.setLevel(logging.INFO)
