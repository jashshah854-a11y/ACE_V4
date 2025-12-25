from observability.metrics import inc_counter, set_gauge, scrape_metrics, reset_metrics


def test_metrics_scrape():
    reset_metrics()
    inc_counter('test_counter', {'foo': 'bar'}, 2)
    set_gauge('test_gauge', 3, {'foo': 'baz'})
    data = scrape_metrics()
    assert 'test_counter{foo="bar"} 2' in data
    assert 'test_gauge{foo="baz"} 3' in data
