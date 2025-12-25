from connectors.manager import ConnectorStore, ConnectorConfig


def test_connector_store_roundtrip(tmp_path):
    config_path = tmp_path / 'connectors.json'
    store = ConnectorStore(config_path)

    cfg = ConnectorConfig(name='test', type='local_file', interval_seconds=10, options={'path': '/tmp'})
    store.upsert(cfg)

    listed = store.list()
    assert listed and listed[0].name == 'test'

    fetched = store.get('test')
    assert fetched is not None
    assert fetched.interval_seconds == 10

    removed = store.delete('test')
    assert removed
    assert store.get('test') is None
