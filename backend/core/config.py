import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    ace_api_base_url: str = "http://localhost:8001"
    port: int = 8001

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    max_upload_size_mb: int = 600

    # Agent execution tuning
    base_agent_timeout: int = 600
    timeout_per_mb: int = 5

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse comma-separated origins into a list."""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        return [o for o in origins if o]

    @property
    def max_upload_size_bytes(self) -> int:
        """Convert MB to bytes."""
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
