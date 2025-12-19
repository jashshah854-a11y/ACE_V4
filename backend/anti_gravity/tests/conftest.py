import importlib.util
import pytest
from pathlib import Path


def pytest_ignore_collect(collection_path: Path):
    """
    Skip anti_gravity tests if optional core.regression module is unavailable.
    """
    if collection_path.name.startswith("test_") and collection_path.suffix == ".py":
        if importlib.util.find_spec("core.regression") is None:
            return True
    return False


def pytest_collection_modifyitems(config, items):
    # As a safeguard, skip at runtime if collected despite ignore
    missing = importlib.util.find_spec("core.regression") is None
    if missing:
        skip_marker = pytest.mark.skip(reason="core.regression not available; skipping anti_gravity tests")
        for item in items:
            item.add_marker(skip_marker)

