from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings."""

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False, extra='ignore')

    ace_api_base_url: str = 'http://localhost:8001'
    port: int = 8001
    allowed_origins: str = 'http://localhost:5173,http://localhost:3000'

    max_upload_size_mb: int = 600
    base_agent_timeout: int = 600
    timeout_per_mb: int = 5

    # SaaS / auth
    auth_enabled: bool = False
    tenancy_mode: str = 'single'
    token_secret: str = 'replace-me-with-strong-secret'
    token_expire_minutes: int = 60

    # Connectors / Scheduler
    connectors_enabled: bool = False
    connectors_config_path: str = 'data/connectors.json'
    connector_state_path: str = 'data/scheduler/runner_state.json'
    scheduler_state_path: str = 'data/scheduler/queue_state.json'
    scheduler_poll_seconds: int = 60
    connector_max_concurrency: int = 1
    metrics_enabled: bool = False
    metrics_path: str = 'data/metrics.prom'
    observability_log_json: bool = True

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(',') if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
