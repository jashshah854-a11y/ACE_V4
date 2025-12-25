import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def hash_tables(tables: Dict[str, Any]) -> str:
    """
    Create a coarse hash of the dataset based on table names,
    row counts and column names. Not a cryptographic guarantee
    but enough to detect change.
    """
    payload = {}
    for name, df in tables.items():
        payload[name] = {
            "rows": int(len(df)),
            "cols": list(df.columns),
        }

    raw = json.dumps(payload, sort_keys=True).encode("utf8")
    return hashlib.sha256(raw).hexdigest()
