import json
import time
from pathlib import Path

from connectors.local import LocalFileConnector
from connectors.runner import ConnectorRunner
from connectors.snowflake import SnowflakeConnector
from connectors.bigquery import BigQueryConnector
from connectors.webhook import WebhookConnector


def test_local_file_connector_selects_latest(tmp_path):
    input_dir = tmp_path / 'input'
    input_dir.mkdir()
    old_file = input_dir / 'old.csv'
    old_file.write_text('a,b\n1,2')
    time.sleep(0.01)
    new_file = input_dir / 'new.csv'
    new_file.write_text('c,d\n3,4')

    connector = LocalFileConnector('local-test', {'path': str(input_dir)})
    result = connector.pull()
    assert result.file_path.name == 'new.csv'
    assert 'source_path' in result.metadata


def test_connector_runner_due_logic(tmp_path):
    config = tmp_path / 'connectors.json'
    state = tmp_path / 'state.json'
    input_dir = tmp_path / 'input'
    input_dir.mkdir()
    (input_dir / 'file.csv').write_text('x,y\n1,2')

    config.write_text(json.dumps({
        'connectors': [
            {
                'name': 'local-one',
                'type': 'local_file',
                'enabled': True,
                'interval_seconds': 1,
                'options': {'path': str(input_dir)},
            }
        ]
    }))

    runner = ConnectorRunner(config_path=config, state_path=state)
    due = list(runner.get_due_connectors())
    assert len(due) == 1
    result = runner.run_once(due[0])
    assert result.file_path.exists()
    # Immediately after run, connector should not be due
    assert list(runner.get_due_connectors()) == []


def test_snowflake_connector_writes_csv(tmp_path, monkeypatch):
    class DummyCursor:
        description = [("a",), ("b",)]

        def __init__(self):
            self.executed = None

        def execute(self, query):
            self.executed = query

        def fetchall(self):
            return [(1, 2)]

        def close(self):
            return None

    class DummyConnection:
        def cursor(self):
            return DummyCursor()

        def close(self):
            return None

    class DummyClient:
        @staticmethod
        def connect(**kwargs):
            return DummyConnection()

    monkeypatch.setattr(SnowflakeConnector, '_get_client', lambda self: DummyClient)
    connector = SnowflakeConnector('sf', {
        'account': 'acct',
        'user': 'user',
        'password': 'pass',
        'warehouse': 'main',
        'query': 'select 1',
        'output_dir': str(tmp_path),
    })
    result = connector.pull()
    assert result.file_path.exists()
    assert result.metadata['connector'] == 'snowflake'


def test_bigquery_connector(tmp_path, monkeypatch):
    class DummyRow(dict):
        def get(self, key):
            return super().get(key)

    class DummyJob:
        schema = []

        def __init__(self):
            self.schema = [type('F', (), {'name': 'foo'})(), type('F', (), {'name': 'bar'})()]

        def result(self):
            return [DummyRow(foo=1, bar=2)]

    class DummyClient:
        def __init__(self, project=None):
            self.project = project

        def query(self, query):
            return DummyJob()

    monkeypatch.setattr(BigQueryConnector, '_get_client', lambda self: lambda project=None: DummyClient(project))
    connector = BigQueryConnector('bq', {'query': 'select * from table', 'project': 'demo', 'output_dir': str(tmp_path)})
    result = connector.pull()
    assert result.file_path.exists()
    assert result.metadata['connector'] == 'bigquery'


def test_webhook_connector(tmp_path, monkeypatch):
    class DummyResponse:
        status_code = 200
        text = 'foo,bar\n1,2'

        def json(self):
            return {'foo': 1}

    def fake_request(method, url, headers=None, data=None, timeout=30):
        return DummyResponse()

    monkeypatch.setattr('connectors.webhook.requests.request', fake_request)
    connector = WebhookConnector('hook', {'url': 'https://example.com', 'output_dir': str(tmp_path)})
    result = connector.pull()
    assert result.file_path.exists()
    assert result.metadata['connector'] == 'webhook'
