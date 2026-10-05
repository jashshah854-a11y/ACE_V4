import json
from copy import deepcopy
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import backend.api.server as server
import orchestrator
from core.state_manager import StateManager
from core.task_contract import build_task_contract, parse_task_intent


INTENT = {
    "primary_question": "Why did renewal rates fall in Québec?",
    "decision_context": "Plan the next customer review",
    "success_criteria": "Evidence for the affected groups",
    "required_output_type": "descriptive",
    "constraints": "Do not infer causality",
    "confidence_threshold": 80,
}


@pytest.fixture
def upload_client(monkeypatch, tmp_path):
    queued = []
    monkeypatch.setattr(server, "_safe_upload_path", lambda name: tmp_path / name)
    monkeypatch.setattr(server, "job_queue", SimpleNamespace(
        enqueue=lambda path, run_config: queued.append(run_config) or "deadbeef"
    ))
    # Do not start a worker or connect to Redis for an HTTP boundary test.
    return TestClient(server.app), queued


def test_upload_preserves_question_and_context(upload_client):
    client, queued = upload_client
    response = client.post("/run", files={"file": ("data.csv", b"value\n1\n", "text/csv")},
                           data={"task_intent": json.dumps(INTENT)})
    assert response.status_code == 200
    assert queued == [{"task_intent": INTENT}]


@pytest.mark.parametrize("intent", ["{bad", "[]", "null", '{"primary_question":" "}',
    '{"primary_question":12}', '{"primary_question":"Why?","required_output_type":"magic"}',
    '{"primary_question":"Why?","confidence_threshold":101}',
    '{"primary_question":"Why?","confidence_threshold":NaN}',
    '{"primary_question":"Why?","confidence_threshold":true}',
    '{"primary_question":"Why?","constraints":[]}'])
def test_invalid_intent_is_rejected_before_queueing(upload_client, intent):
    client, queued = upload_client
    response = client.post("/run", files={"file": ("data.csv", b"value\n1\n", "text/csv")},
                           data={"task_intent": intent})
    assert response.status_code == 422
    assert queued == []


def test_no_question_remains_unknown_for_legacy_upload(upload_client):
    client, queued = upload_client
    response = client.post("/run", files={"file": ("data.csv", b"value\n1\n", "text/csv")})
    assert response.status_code == 200
    assert queued == [None]


def test_contract_preserves_intent_without_mutating_request():
    original = deepcopy(INTENT)
    contract = build_task_contract({}, {}, "none", False, False, user_intent=INTENT)
    assert contract["user_intent"] == original
    assert contract["required_output_type"] == "descriptive"
    assert contract["confidence_threshold"] == 80
    assert contract["is_signed"] is True
    assert INTENT == original


def test_contract_without_a_request_is_not_marked_signed():
    contract = build_task_contract({}, {}, "none", False, False)
    assert contract["is_signed"] is False


def test_legacy_question_alias_normalizes_without_replacing_primary_question():
    assert parse_task_intent({"question": "Why?"}) == {"primary_question": "Why?"}
    assert parse_task_intent({"question": "Old?", "primary_question": "New?"}) == {"primary_question": "New?"}


@pytest.fixture
def ingested_run(monkeypatch, tmp_path):
    run_path = tmp_path / "runs" / "deadbeef"
    run_path.mkdir(parents=True)
    source = tmp_path / "data.csv"
    source.write_text("group,value\na,1\nb,2\nc,3\n", encoding="utf-8")
    monkeypatch.setattr(orchestrator, "create_run_folder", lambda run_id: (run_id, str(run_path)))
    monkeypatch.setattr(server, "DATA_DIR", tmp_path)
    run_id, result_path = orchestrator.orchestrate_new_run(
        str(source), run_config={"task_intent": INTENT}, run_id="deadbeef"
    )
    assert result_path == str(run_path)
    return run_id, StateManager(result_path)


def test_ingestion_and_snapshot_preserve_question(ingested_run):
    run_id, state = ingested_run
    assert state.read("task_intent") == INTENT
    assert state.read("run_config")["task_intent"] == INTENT
    assert state.read("task_contract")["user_intent"] == INTENT
    for lite in (True, False):
        payload, _ = server._build_snapshot_payload(run_id, lite=lite)
        assert payload["task_intent"] == INTENT


def test_governance_rebuild_preserves_stored_intent(ingested_run):
    from core.governance import rebuild_governance_artifacts

    _, state = ingested_run
    rebuilt = rebuild_governance_artifacts(state)
    assert rebuilt["task_contract"]["user_intent"] == INTENT
    assert rebuilt["task_contract"]["is_signed"] is True
