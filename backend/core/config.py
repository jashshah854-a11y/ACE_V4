import os
import sys
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

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
# LOWERED to 5% - Accept almost any data
QUALITY_THRESHOLD = 0.05  # Was 0.5, then 0.1, now 0.05

# ENABLE drift as a blocker for governance safety
ENABLE_DRIFT_BLOCKING = True

# Allow insights even with low confidence
MIN_CONFIDENCE_FOR_INSIGHTS = 0.1

# Expand keywords to detect value in Steam/Gaming datasets
BUSINESS_KEYWORDS = [
    'revenue', 'price', 'cost', 'profit', 'budget', 'sales', 
    'ltv', 'value', 'recommendations', 'review', 'churn', 
    'customer', 'amount', 'qty'
]

# ============================================================================
# Settings Class - Complete Pydantic Configuration
# ============================================================================
_SKIP_ENV_FILE = bool(
    os.getenv("PYTEST_CURRENT_TEST")
    or os.getenv("ACE_SKIP_ENV_FILE")
    or "pytest" in sys.modules
)


class Settings(BaseSettings):
    """Application configuration settings with Pydantic validation"""

    model_config = SettingsConfigDict(
        env_file=None if _SKIP_ENV_FILE else ".env",
        case_sensitive=False,
        extra="ignore"
    )

    # API Configuration
    ace_api_base_url: str = "http://localhost:8001"
    port: int = 8001

    # CORS Settings
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:8081,https://intelligent-insight-engine-9926c6ff-bhrzsrk6m.vercel.app"

    # Upload Limits
    max_upload_size_mb: int = 600
    
    # Agent Execution Tuning
    base_agent_timeout: int = 600
    timeout_per_mb: int = 5

    # Governance
    quality_threshold: float = QUALITY_THRESHOLD
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        return [o for o in origins if o]

    @property
    def max_upload_size_bytes(self) -> int:
        """Convert MB to bytes - fixes AttributeError."""
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def data_dir(self) -> str:
        """Return string path for backward compatibility."""
        return str(DATA_DIR)

    def get_runs_dir(self) -> Path:
        """Get absolute path to runs directory."""
        runs_dir = DATA_DIR / "runs"
        runs_dir.mkdir(parents=True, exist_ok=True)
        return runs_dir


# Instantiate the settings
settings = Settings()

print(f"[CONFIG] GLOBAL DATA_DIR: {DATA_DIR}", flush=True)
print(f"[CONFIG] GOVERNANCE THRESHOLD: {QUALITY_THRESHOLD}", flush=True)
print(f"[CONFIG] Upload Limit: {settings.max_upload_size_mb}MB ({settings.max_upload_size_bytes} bytes)", flush=True)
