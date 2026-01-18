import importlib.util
import os
import tempfile
from pathlib import Path

_TEMP_ROOT = Path("C:/Users/jashs/Projects/ACE_V4/backend/data/pytest_tmp")
_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("TMPDIR", str(_TEMP_ROOT))
os.environ.setdefault("TEMP", str(_TEMP_ROOT))
os.environ.setdefault("TMP", str(_TEMP_ROOT))
tempfile.tempdir = str(_TEMP_ROOT)


def pytest_ignore_collect(collection_path: Path):
    """
    Skip legacy tests that require optional deps not installed (e.g., slowapi).
    """
    if collection_path.name == "test_components.py":
        if importlib.util.find_spec("slowapi") is None:
            return True
    return False

