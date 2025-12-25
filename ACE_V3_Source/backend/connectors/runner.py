from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict, Iterable, List

from .base import ConnectorResult, SourceConnector
from .local import LocalFileConnector
from .s3 import S3Connector
from .snowflake import SnowflakeConnector
from .bigquery import BigQueryConnector
from .webhook import WebhookConnector

CONNECTOR_TYPES = {
    'local_file': LocalFileConnector,
    's3': S3Connector,
    'snowflake': SnowflakeConnector,
    'bigquery': BigQueryConnector,
    'webhook': WebhookConnector,
}


class ConnectorRunner:
    def __init__(self, config_path: Path, state_path: Path):
        self.config_path = config_path
        self.state_path = state_path
        self._state = self._load_state()

    def _load_state(self) -> Dict[str, Dict]:
        if not self.state_path.exists():
            return {}
        with open(self.state_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_state(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.state_path, 'w', encoding='utf-8') as f:
            json.dump(self._state, f, indent=2)

    def load_config(self) -> List[Dict]:
        if not self.config_path.exists():
            return []
        with open(self.config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, dict):
            data = data.get('connectors', [])
        return [cfg for cfg in data if cfg.get('enabled', True)]

    def _is_due(self, name: str, interval: int) -> bool:
        entry = self._state.get(name) or {}
        last_run = entry.get('last_run_at') or 0
        return (time.time() - last_run) >= max(interval, 1)

    def get_due_connectors(self) -> Iterable[Dict]:
        for cfg in self.load_config():
            interval = int(cfg.get('interval_seconds') or 0)
            if interval <= 0:
                continue
            name = cfg.get('name') or cfg.get('type')
            if self._is_due(name, interval):
                yield cfg

    def _build_connector(self, cfg: Dict) -> SourceConnector:
        name = cfg.get('name') or cfg['type']
        connector_type = cfg.get('type')
        cls = CONNECTOR_TYPES.get(connector_type)
        if not cls:
            raise ValueError(f'Unsupported connector type: {connector_type}')
        return cls(name=name, options=cfg.get('options', {}))

    def run_once(self, cfg: Dict) -> ConnectorResult:
        connector = self._build_connector(cfg)
        start = time.time()
        name = cfg.get('name') or cfg['type']
        try:
            result = connector.pull()
            self._state[name] = {
                'last_run_at': time.time(),
                'last_status': 'success',
                'duration': time.time() - start,
                'metadata': result.metadata,
            }
            return result
        except Exception as exc:
            self._state[name] = {
                'last_run_at': time.time(),
                'last_status': f'error: {exc}',
            }
            raise
        finally:
            connector.cleanup()
            self._save_state()
