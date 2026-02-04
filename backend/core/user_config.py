"""User configuration storage for ACE V4.

Allows users to save and load analysis configurations for reuse.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class AnalysisConfig:
    """A saved analysis configuration."""
    id: str
    name: str
    description: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    # Analysis settings
    target_column: Optional[str] = None
    feature_whitelist: Optional[List[str]] = None
    model_type: Optional[str] = None  # random_forest, xgboost, gradient_boosting, etc.
    fast_mode: bool = False
    include_categoricals: bool = False

    # Task intent
    primary_question: Optional[str] = None
    required_output_type: Optional[str] = None  # diagnostic, predictive, exploratory
    confidence_threshold: float = 0.8

    # Tags for organization
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalysisConfig":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    def to_run_config(self) -> Dict[str, Any]:
        """Convert to run_config format for the pipeline."""
        config: Dict[str, Any] = {}

        if self.target_column:
            config["target_column"] = self.target_column
        if self.feature_whitelist:
            config["feature_whitelist"] = self.feature_whitelist
        if self.model_type:
            config["model_type"] = self.model_type
        if self.fast_mode:
            config["fast_mode"] = True
        if self.include_categoricals:
            config["include_categoricals"] = True

        # Task intent
        if self.primary_question or self.required_output_type:
            config["task_intent"] = {}
            if self.primary_question:
                config["task_intent"]["primary_question"] = self.primary_question
            if self.required_output_type:
                config["task_intent"]["required_output_type"] = self.required_output_type
            config["task_intent"]["confidence_threshold"] = self.confidence_threshold

        return config


class UserConfigStore:
    """Manages saved user configurations."""

    def __init__(self, storage_path: Optional[Path] = None):
        if storage_path is None:
            storage_path = Path("data/user_configs")
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._configs_file = self.storage_path / "configs.json"
        self._configs: Dict[str, AnalysisConfig] = {}
        self._load()

    def _load(self):
        """Load configs from disk."""
        if self._configs_file.exists():
            try:
                with open(self._configs_file) as f:
                    data = json.load(f)
                self._configs = {
                    k: AnalysisConfig.from_dict(v) for k, v in data.items()
                }
            except Exception:
                self._configs = {}

    def _save(self):
        """Save configs to disk."""
        data = {k: v.to_dict() for k, v in self._configs.items()}
        with open(self._configs_file, "w") as f:
            json.dump(data, f, indent=2)

    def create(self, config: AnalysisConfig) -> AnalysisConfig:
        """Save a new configuration."""
        if not config.id:
            config.id = f"config_{int(time.time() * 1000)}"
        config.created_at = time.time()
        config.updated_at = time.time()
        self._configs[config.id] = config
        self._save()
        return config

    def update(self, config_id: str, updates: Dict[str, Any]) -> Optional[AnalysisConfig]:
        """Update an existing configuration."""
        if config_id not in self._configs:
            return None

        config = self._configs[config_id]
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        config.updated_at = time.time()
        self._save()
        return config

    def delete(self, config_id: str) -> bool:
        """Delete a configuration."""
        if config_id in self._configs:
            del self._configs[config_id]
            self._save()
            return True
        return False

    def get(self, config_id: str) -> Optional[AnalysisConfig]:
        """Get a configuration by ID."""
        return self._configs.get(config_id)

    def list(self, tags: Optional[List[str]] = None) -> List[AnalysisConfig]:
        """List all configurations, optionally filtered by tags."""
        configs = list(self._configs.values())

        if tags:
            configs = [c for c in configs if any(t in c.tags for t in tags)]

        # Sort by updated_at descending
        configs.sort(key=lambda c: c.updated_at, reverse=True)
        return configs

    def search(self, query: str) -> List[AnalysisConfig]:
        """Search configurations by name or description."""
        query = query.lower()
        return [
            c for c in self._configs.values()
            if query in c.name.lower() or query in c.description.lower()
        ]


# Global store instance
_store: Optional[UserConfigStore] = None


def get_config_store(storage_path: Optional[Path] = None) -> UserConfigStore:
    """Get or create the global config store."""
    global _store
    if _store is None:
        _store = UserConfigStore(storage_path)
    return _store
