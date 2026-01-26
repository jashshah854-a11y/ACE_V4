from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict


def log_step_event(payload: Dict[str, Any]) -> None:
    payload = dict(payload)
    payload.setdefault("timestamp", datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"))
    print(json.dumps(payload), flush=True)