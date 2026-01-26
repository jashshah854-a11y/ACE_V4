from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional


CACHE_DIR = Path("data") / "cache"


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def load_cache(key: str) -> Optional[Any]:
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def save_cache(key: str, payload: Any) -> None:
    path = _cache_path(key)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp.replace(path)
