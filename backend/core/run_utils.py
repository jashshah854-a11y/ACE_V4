import os
from pathlib import Path
import uuid

def create_run_folder(base_dir="data/runs", run_id=None):
    """
    Creates a unique run folder based on a short UUID.
    Returns the run_id and the absolute path to the run folder.
    """
    run_id = run_id or str(uuid.uuid4())[:8]
    path = Path(base_dir) / run_id
    path.mkdir(parents=True, exist_ok=True)
    return run_id, str(path.resolve())
