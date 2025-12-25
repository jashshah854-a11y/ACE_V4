from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class ConnectorConfig(BaseModel):
    name: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    enabled: bool = True
    interval_seconds: int = Field(ge=1, default=3600)
    options: Dict[str, str] = Field(default_factory=dict)

    @field_validator('name')
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return value.strip()


class ConnectorStore:
    def __init__(self, config_path: Path):
        self.config_path = config_path
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

    def _load_raw(self) -> Dict:
        if not self.config_path.exists():
            return {'connectors': []}
        with open(self.config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            return {'connectors': data}
        if 'connectors' not in data:
            data['connectors'] = []
        return data

    def _save_raw(self, payload: Dict) -> None:
        tmp = self.config_path.with_suffix('.tmp')
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(payload, f, indent=2)
        tmp.replace(self.config_path)

    def list(self) -> List[ConnectorConfig]:
        payload = self._load_raw()
        return [ConnectorConfig(**cfg) for cfg in payload.get('connectors', [])]

    def upsert(self, config: ConnectorConfig) -> ConnectorConfig:
        payload = self._load_raw()
        connectors = payload.get('connectors', [])
        updated = False
        for idx, existing in enumerate(connectors):
            if existing.get('name') == config.name:
                connectors[idx] = config.model_dump()
                updated = True
                break
        if not updated:
            connectors.append(config.model_dump())
        payload['connectors'] = connectors
        self._save_raw(payload)
        return config

    def delete(self, name: str) -> bool:
        payload = self._load_raw()
        connectors = payload.get('connectors', [])
        new_list = [cfg for cfg in connectors if cfg.get('name') != name]
        removed = len(new_list) != len(connectors)
        payload['connectors'] = new_list
        self._save_raw(payload)
        return removed

    def get(self, name: str) -> Optional[ConnectorConfig]:
        for cfg in self.list():
            if cfg.name == name:
                return cfg
        return None
