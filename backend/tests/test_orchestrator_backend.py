import json
from pathlib import Path

import orchestrator


def _prepare_run(tmp_path, monkeypatch):
    monkeypatch.setattr(orchestrator, "PIPELINE_SEQUENCE", ["dummy_step"])
    monkeypatch.setattr(orchestrator, "PIPELINE_DESCRIPTIONS", {"dummy_step": "Dummy"})
    run_path = tmp_path / "run"
    run_path.mkdir()
    data_path = run_path / "data.csv"
    data_path.write_text("value\n1\n", encoding="utf-8")
    state_path = run_path / "orchestrator_state.json"
    orchestrator.initialize_state("test-run", str(state_path), str(data_path))
    return run_path, state_path


def _load_state(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def test_main_loop_retries_until_success(monkeypatch, tmp_path):
    run_path, state_path = _prepare_run(tmp_path, monkeypatch)
    attempts = {"count": 0}

    def fake_agent(step, _run_path):
        attempts["count"] += 1
        if attempts["count"] < 2:
            return False, "", "boom"
        return True, "done", ""

    monkeypatch.setattr(orchestrator, "run_agent", fake_agent)
    monkeypatch.setattr(orchestrator, "RETRY_BACKOFF", 0)

    orchestrator.main_loop(str(run_path))

    final_state = _load_state(state_path)
    step_state = final_state["steps"]["dummy_step"]
    assert attempts["count"] == 2
    assert step_state["attempts"] == 2
    assert step_state["status"] == "completed"
    assert final_state["status"] == "complete"
    assert any("attempt 1 failed" in h.get("event", "") for h in final_state.get("history", []))


def test_main_loop_marks_errors_after_retry_exhaustion(monkeypatch, tmp_path):
    run_path, state_path = _prepare_run(tmp_path, monkeypatch)

    def always_fail(step, _run_path):
        return False, "", "boom"

    monkeypatch.setattr(orchestrator, "run_agent", always_fail)
    monkeypatch.setattr(orchestrator, "RETRY_BACKOFF", 0)

    orchestrator.main_loop(str(run_path))

    final_state = _load_state(state_path)
    step_state = final_state["steps"]["dummy_step"]
    assert step_state["status"] == "failed"
    assert "dummy_step" in final_state.get("failed_steps", [])
    assert final_state["status"] == "complete_with_errors"
