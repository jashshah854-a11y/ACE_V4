from __future__ import annotations

import csv
import importlib
import time
from pathlib import Path
from typing import Dict, Optional

from .base import ConnectorResult, SourceConnector, ensure_output_path


class BigQueryConnector(SourceConnector):
    """Run a BigQuery SQL query and download results to CSV."""

    module_name = 'google.cloud.bigquery'

    def _get_client(self):  # pragma: no cover - patched in tests
        module = importlib.import_module(self.module_name)
        return module.Client

    def pull(self) -> ConnectorResult:
        client_cls = self._get_client()
        project = self.options.get('project')
        query = self.options.get('query')
        table = self.options.get('table')
        if not (query or table):
            raise ValueError('BigQuery connector requires "query" or "table" option')
        client = client_cls(project=project) if project else client_cls()

        if query:
            job = client.query(query)
            rows = job.result()
            schema = getattr(rows, 'schema', None) or getattr(job, 'schema', None)
            iterable = list(rows)
        else:
            if not table:
                raise ValueError('BigQuery table option missing')
            table_ref = client.get_table(table)
            rows_iter = client.list_rows(table_ref)
            schema = getattr(rows_iter, 'schema', None)
            iterable = list(rows_iter)

        if not schema:
            raise RuntimeError('BigQuery schema information unavailable')

        columns = [field.name for field in schema]
        target_dir = Path(self.options.get('output_dir', 'data/uploads/connectors')).resolve()
        filename = f"bigquery-{int(time.time())}.csv"
        target_path = ensure_output_path(target_dir, self.name, filename)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        with open(target_path, 'w', newline='', encoding='utf-8') as handle:
            writer = csv.writer(handle)
            writer.writerow(columns)
            for row in iterable:
                if hasattr(row, 'get'):
                    values = [row.get(col) for col in columns]
                else:
                    values = [row[col] if hasattr(row, '__getitem__') else getattr(row, col, None) for col in columns]
                writer.writerow(values)

        metadata: Dict[str, Optional[str]] = {
            'connector': 'bigquery',
            'project': project,
            'query': query if query else f'table:{table}',
        }
        return ConnectorResult(file_path=target_path, metadata=metadata, connector_name=self.name)
