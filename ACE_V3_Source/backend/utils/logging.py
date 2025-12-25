import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class StructuredFormatter(logging.Formatter):
    """JSON structured logging formatter."""

    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if hasattr(record, "run_id"):
            log_data["run_id"] = record.run_id

        if hasattr(record, "user_ip"):
            log_data["user_ip"] = record.user_ip

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        return json.dumps(log_data)


_ace_logger: Optional[logging.Logger] = None


def get_logger() -> logging.Logger:
    """Get or create the ACE logger instance."""
    global _ace_logger
    if _ace_logger is None:
        _ace_logger = logging.getLogger("ace")
        _ace_logger.setLevel(logging.INFO)

        if not _ace_logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            formatter = StructuredFormatter()
            handler.setFormatter(formatter)
            _ace_logger.addHandler(handler)

    return _ace_logger


def log_info(msg: str, **kwargs):
    """Log info message with optional structured data."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.info(msg, extra=extra)
    else:
        logger.info(msg)
    print(f"[INFO] {msg}")


def log_ok(msg: str, **kwargs):
    """Log success message with optional structured data."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.info(f"[OK] {msg}", extra=extra)
    else:
        logger.info(f"[OK] {msg}")
    print(f"[OK] {msg}")


def log_error(msg: str, exc_info=None, **kwargs):
    """Log error message with optional exception and structured data."""
    logger = get_logger()
    extra = {}
    if kwargs:
        extra["extra_data"] = kwargs
    logger.error(msg, exc_info=exc_info, extra=extra if extra else None)
    print(f"[ERROR] {msg}")


def log_section(msg: str):
    """Log section header."""
    logger = get_logger()
    logger.info(f"===== {msg} =====")
    print(f"\n===== {msg} =====")


def log_step(msg: str, **kwargs):
    """Log step message."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.info(f"[STEP] {msg}", extra=extra)
    else:
        logger.info(f"[STEP] {msg}")
    print(f"[STEP] {msg}")


def log_scan(msg: str, **kwargs):
    """Log scan message."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.info(f"[SCAN] {msg}", extra=extra)
    else:
        logger.info(f"[SCAN] {msg}")
    print(f"[SCAN] {msg}")


def log_warn(msg: str, **kwargs):
    """Log warning message."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.warning(msg, extra=extra)
    else:
        logger.warning(msg)
    print(f"[WARN] {msg}")


def log_launch(msg: str, **kwargs):
    """Log launch message."""
    logger = get_logger()
    if kwargs:
        extra = {"extra_data": kwargs}
        logger.info(f"[LAUNCH] {msg}", extra=extra)
    else:
        logger.info(f"[LAUNCH] {msg}")
    print(f"[LAUNCH] {msg}")
