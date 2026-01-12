import os
from pathlib import Path

# ============================================================================
# LAW 1: ABSOLUTE ANCHORING - Single Source of Truth
# ============================================================================
# Resolve to the project root (assuming config.py is in backend/core/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent  # Project root
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BACKEND_DIR / "data"

# Ensure the physical path exists immediately
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# LAW 5: LIBERAL GOVERNANCE - Relax Quality Thresholds
# ============================================================================
# Lower threshold to allow "Predictive Mode" on messy data
QUALITY_THRESHOLD = 0.1  # Was 0.5

# Expand keywords to detect value in Steam/Gaming datasets
BUSINESS_KEYWORDS = [
    'revenue', 'price', 'cost', 'profit', 'budget', 'sales', 
    'ltv', 'value', 'recommendations', 'review'
]

print(f"[CONFIG] ⚓ GLOBAL DATA_DIR ANCHORED: {DATA_DIR}", flush=True)
print(f"[CONFIG] 🔓 GOVERNANCE THRESHOLD: {QUALITY_THRESHOLD}", flush=True)

# ============================================================================
# Backward Compatibility - Minimal Settings Object
# ============================================================================
class _Settings:
    """Minimal settings object for backward compatibility"""
    @property
    def data_dir(self):
        return str(DATA_DIR)
    
    def get_runs_dir(self):
        runs_dir = DATA_DIR / "runs"
        runs_dir.mkdir(parents=True, exist_ok=True)
        return runs_dir

settings = _Settings()
