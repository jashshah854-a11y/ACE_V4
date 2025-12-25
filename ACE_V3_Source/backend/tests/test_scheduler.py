import json
from pathlib import Path
from unittest.mock import patch

from jobs import scheduler


def test_scheduler_enqueues_jobs(tmp_path):
    input_dir = tmp_path / 'input'
    input_dir.mkdir()
    src_file = input_dir / 'dataset.csv'
    src_file.write_text('foo,bar\n1,2')

    config = tmp_path / 'connectors.json'
    config.write_text(json.dumps({
        'connectors': [
            {
                'name': 'local-test',
                'type': 'local_file',
                'enabled': True,
                'interval_seconds': 1,
                'options': {
                    'path': str(input_dir),
                    'output_dir': str(tmp_path / 'out'),
                },
            },
            {
                'name': 'local-second',
                'type': 'local_file',
                'enabled': True,
                'interval_seconds': 1,
                'options': {
                    'path': str(input_dir),
                    'output_dir': str(tmp_path / 'out2'),
                },
            },
        ]
    }))

    queue_state = tmp_path / 'queue_state.json'
    runner_state = tmp_path / 'runner_state.json'

    with patch('jobs.scheduler.enqueue') as mock_enqueue:
        scheduler.run_scheduler(
            config_path=config,
            progress_state=queue_state,
            runner_state=runner_state,
            poll_seconds=0,
            max_cycles=1,
        )
    assert mock_enqueue.call_count == 2
