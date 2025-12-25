from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Dict

import requests

from .base import ConnectorResult, SourceConnector, ensure_output_path


class WebhookConnector(SourceConnector):
    """Fetch data from an HTTP endpoint and save response payload."""

    def pull(self) -> ConnectorResult:
        url = self.options.get('url')
        if not url:
            raise ValueError('Webhook connector requires "url" option')
        method = (self.options.get('method') or 'GET').upper()
        headers = self.options.get('headers') or {}
        body = self.options.get('body')
        timeout = int(self.options.get('timeout', 30))

        response = requests.request(method, url, headers=headers, data=body, timeout=timeout)
        if response.status_code >= 400:
            raise RuntimeError(f'Webhook request failed: {response.status_code}')

        fmt = (self.options.get('format') or 'raw').lower()
        suffix = self.options.get('suffix')
        content: str
        if fmt == 'json':
            data = response.json()
            content = json.dumps(data)
            suffix = suffix or '.json'
        else:
            content = response.text
            suffix = suffix or '.txt'

        target_dir = Path(self.options.get('output_dir', 'data/uploads/connectors')).resolve()
        filename = f"webhook-{int(time.time())}{suffix}"
        target_path = ensure_output_path(target_dir, self.name, filename)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding='utf-8')

        metadata: Dict[str, str] = {
            'connector': 'webhook',
            'url': url,
            'status_code': str(response.status_code),
        }
        return ConnectorResult(file_path=target_path, metadata=metadata, connector_name=self.name)
