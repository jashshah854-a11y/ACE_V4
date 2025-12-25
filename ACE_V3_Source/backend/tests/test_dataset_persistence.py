from pathlib import Path

from ace_v3_entry import _persist_active_dataset
from core.state_manager import StateManager


def test_persist_active_dataset(tmp_path):
    data_file = tmp_path / "input.csv"
    data_file.write_text("col\n1\n", encoding="utf-8")
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    state = StateManager(str(run_dir))

    saved_path = _persist_active_dataset(state, str(data_file))
    expected = state.get_file_path("cleaned_uploaded.csv")

    assert Path(saved_path).exists()
    assert Path(saved_path).samefile(expected)

    active = state.read("active_dataset")
    assert active and active.get("path") == saved_path
