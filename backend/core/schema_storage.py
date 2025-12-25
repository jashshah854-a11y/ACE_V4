import json
from pathlib import Path
from typing import Any, Optional
from core.schema import SchemaMap
from utils.logging import log_ok, log_error, log_warn

# Constants for file paths
DATA_DIR = Path("data")
SCHEMAS_DIR = DATA_DIR / "schemas"
ACTIVE_SCHEMA_PATH = DATA_DIR / "schema_map.json"

def save_schema_map(schema: SchemaMap, memory_client: Optional[Any] = None) -> None:
    """
    Persist the schema map according to ACE V3 Option D storage strategy.
    
    1. Save active schema to data/schema_map.json
    2. Save historical snapshot to data/schemas/{name}_schema.json
    3. Save to ACE State memory (if client provided)
    """
    # Ensure directories exist
    DATA_DIR.mkdir(exist_ok=True)
    SCHEMAS_DIR.mkdir(exist_ok=True)
    
    # Convert Pydantic model to dict
    schema_dict = schema.model_dump()
    
    # 1. Save active schema (The one agents read)
    try:
        with open(ACTIVE_SCHEMA_PATH, "w", encoding="utf-8") as f:
            json.dump(schema_dict, f, indent=2)
        log_ok(f"Active schema saved to {ACTIVE_SCHEMA_PATH}")
    except Exception as e:
        log_error(f"Failed to save active schema: {e}")
        raise e
    
    # 2. Save dataset-specific snapshot (History/Comparison)
    dataset_name = schema.dataset_info.name
    if dataset_name:
        # Sanitize filename just in case
        safe_name = "".join([c for c in dataset_name if c.isalnum() or c in (' ', '_', '-')]).strip().replace(' ', '_')
        snapshot_path = SCHEMAS_DIR / f"{safe_name}_schema.json"
        try:
            with open(snapshot_path, "w", encoding="utf-8") as f:
                json.dump(schema_dict, f, indent=2)
            log_ok(f"Schema snapshot saved to {snapshot_path}")
        except Exception as e:
            log_warn(f"Failed to save schema snapshot: {e}")
    
    # 3. Save to ACE State Memory
    if memory_client:
        try:
            # Support both direct dict access or a write method
            if hasattr(memory_client, "write"):
                memory_client.write("schema_map", schema_dict)
            elif hasattr(memory_client, "__setitem__"):
                memory_client["schema_map"] = schema_dict
            else:
                log_warn("Memory client does not support write or __setitem__")
                return
            log_ok("Schema saved to ACE State memory")
        except Exception as e:
            log_warn(f"Failed to save schema to memory: {e}")

def load_active_schema() -> Optional[SchemaMap]:
    """
    Load the currently active schema map from disk.
    Used by agents when memory is not available or as a fallback.
    """
    if not ACTIVE_SCHEMA_PATH.exists():
        return None
    
    try:
        with open(ACTIVE_SCHEMA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return SchemaMap(**data)
    except Exception as e:
        log_warn(f"Failed to load active schema: {e}")
        return None
