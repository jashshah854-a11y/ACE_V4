import importlib.util
from pathlib import Path


def pytest_ignore_collect(collection_path: Path):
    """
    Skip legacy tests that require optional deps not installed (e.g., slowapi).
    """
    if collection_path.name == "test_components.py":
        if importlib.util.find_spec("slowapi") is None:
            return True
    return False

