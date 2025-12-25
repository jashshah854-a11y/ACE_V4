from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

_LEVELS = {
    'debug': logging.DEBUG,
    'info': logging.INFO,
    'warning': logging.WARNING,
    'error': logging.ERROR,
    'critical': logging.CRITICAL,
}


def _default_formatter(record: logging.LogRecord) -> str:
    payload = {
        'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'level': record.levelname.lower(),
        'component': getattr(record, 'component', 'app'),
        'message': record.getMessage(),
    }
    if record.__dict__.get('extra_fields'):
        payload.update(record.__dict__['extra_fields'])
    return json.dumps(payload, ensure_ascii=False)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # pragma: no cover - thin wrapper
        return _default_formatter(record)


def get_logger(component: str,
               *,
               json_logs: Optional[bool] = None,
               log_file: Optional[str] = None) -> logging.Logger:
    logger = logging.getLogger(f'ace.{component}')
    if logger.handlers:
        return logger

    json_mode = json_logs
    if json_mode is None:
        json_mode = os.getenv('ACE_OBS_JSON_LOGS', '1') not in {'0', 'false', 'False'}

    handler: logging.Handler
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(log_path, encoding='utf-8')
    else:
        handler = logging.StreamHandler()

    if json_mode:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter('[%(asctime)s] [%(levelname)s] %(component)s: %(message)s'))

    logger.addHandler(handler)
    logger.setLevel(_LEVELS.get(os.getenv('ACE_LOG_LEVEL', 'info').lower(), logging.INFO))
    logger.propagate = False
    logger = logging.LoggerAdapter(logger, {'component': component})  # type: ignore[arg-type]
    return logger  # type: ignore[return-value]


def log_event(logger: logging.Logger, level: str, message: str, **extra: Any) -> None:
    lvl = _LEVELS.get(level.lower(), logging.INFO)
    extra_payload = {'extra_fields': extra} if extra else None
    if extra_payload:
        logger.log(lvl, message, extra=extra_payload)
    else:  # pragma: no cover - fall back to plain logging
        logger.log(lvl, message)

