"""Centralized environment hooks used by ACE agents."""
import os


def ensure_windows_cpu_env():
    """Set LOKY_MAX_CPU_COUNT on Windows if joblib can't detect physical cores."""
    if os.name == "nt":
        os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 4))


ensure_windows_cpu_env()
