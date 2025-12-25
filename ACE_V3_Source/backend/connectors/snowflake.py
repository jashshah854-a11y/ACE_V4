from __future__ import annotations

import csv
import importlib
import time
from pathlib import Path
from typing import Dict

from .base import ConnectorResult, SourceConnector, ensure_output_path


class SnowflakeConnector(SourceConnector):
    """Pull the results of a Snowflake query into a CSV file."""

    module_name = 'snowflake.connector'

    def _get_client(self):  # pragma: no cover - patched in tests
        return importlib.import_module(self.module_name)

    def pull(self) -> ConnectorResult:
        client = self._get_client()
        params = {
            'account': self.options.get('account'),
            'user': self.options.get('user'),
            'password': self.options.get('password'),
            'warehouse': self.options.get('warehouse'),
            'database': self.options.get('database'),
            'schema': self.options.get('schema'),
            'role': self.options.get('role'),
        }
        query = self.options.get('query')
        if not query:
            raise ValueError('Snowflake connector requires "query" option')
        if not params['account'] or not params['user'] or not params['password']:
            raise ValueError('Snowflake connector requires account, user, password')

        connection = client.connect(**{k: v for k, v in params.items() if v})
        cursor = connection.cursor()
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            columns = [col[0] for col in cursor.description]
        finally:  # pragma: no cover - best effort cleanup
            try:
                cursor.close()
            finally:
                connection.close()

        target_dir = Path(self.options.get('output_dir', 'data/uploads/connectors')).resolve()
        filename = f"snowflake-{int(time.time())}.csv"
        target_path = ensure_output_path(target_dir, self.name, filename)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        with open(target_path, 'w', newline='', encoding='utf-8') as handle:
            writer = csv.writer(handle)
            writer.writerow(columns)
            writer.writerows(rows)

        metadata: Dict[str, str] = {
            'connector': 'snowflake',
            'account': params['account'],
            'warehouse': params.get('warehouse'),
        }
        return ConnectorResult(file_path=target_path, metadata=metadata, connector_name=self.name)
