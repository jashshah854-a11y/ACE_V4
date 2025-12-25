from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Dict

from core.config import settings

_LOCK = threading.Lock()
_COUNTERS: Dict[str, Dict[str, float]] = {}
_GAUGES: Dict[str, Dict[str, float]] = {}


def _format_labels(labels: Dict[str, str]) -> str:
    if not labels:
        return ''
    parts = [f"{key}=\"{value}\"" for key, value in sorted(labels.items())]
    return '{' + ','.join(parts) + '}'


def inc_counter(name: str, labels: Dict[str, str] | None = None, amount: float = 1.0) -> None:
    with _LOCK:
        bucket = _COUNTERS.setdefault(name, {})
        label_key = _format_labels(labels or {})
        bucket[label_key] = bucket.get(label_key, 0.0) + amount


def set_gauge(name: str, value: float, labels: Dict[str, str] | None = None) -> None:
    with _LOCK:
        bucket = _GAUGES.setdefault(name, {})
        label_key = _format_labels(labels or {})
        bucket[label_key] = value


def scrape_metrics() -> str:
    lines = []
    with _LOCK:
        for metric, series in _COUNTERS.items():
            for label_key, value in series.items():
                lines.append(f"{metric}{label_key} {value}")
        for metric, series in _GAUGES.items():
            for label_key, value in series.items():
                lines.append(f"{metric}{label_key} {value}")
    return "\n".join(lines) + "\n"


def write_metrics_file(path: str | None = None) -> None:
    if not settings.metrics_enabled:
        return
    target = Path(path or settings.metrics_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(scrape_metrics(), encoding='utf-8')


def record_job_duration(metric: str, start_time: float, labels: Dict[str, str] | None = None) -> None:
    duration = max(0.0, time.time() - start_time)
    inc_counter(metric, labels, duration)


def reset_metrics() -> None:
    with _LOCK:
        _COUNTERS.clear()
        _GAUGES.clear()
