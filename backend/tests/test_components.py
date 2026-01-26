import sys
import os
import json
from unittest.mock import MagicMock, patch
from pathlib import Path
import api.server as api_server

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.persona_engine import PersonaEngine
from core.schema import SchemaMap
from core.state_manager import StateManager

def test_persona_json_extraction():
    print("\n--- Testing Persona JSON Extraction (Test 3) ---")
    
    # Mock Schema and State
    schema_map = SchemaMap()
    state = MagicMock(spec=StateManager)
    state.read.return_value = {} # No overseer output
    
    engine = PersonaEngine(schema_map, state)
    
    # Mock LLM Response
    mock_response = """
    Here is your result

    ```json
    {
      "personas": [
        {"name": "High Spender", "traits": ["shops often"]},
        {"name": "Low Activity", "traits": ["rare logins"]}
      ]
    }
    ```

    Extra text below
    """
    
    with patch("agents.persona_engine.ask_gemini", return_value=mock_response):
        # Mock fingerprints to avoid warning, though not strictly needed for this test if we mock ask_gemini
        # But run() logic checks for fingerprints.
        # Let's mock the state read to return fingerprints
        state.read.return_value = {"fingerprints": {"0": {"size": 10}}}
        
        personas = engine.run()
        
        if personas and len(personas) == 2:
            print("PASSED: Extracted 2 personas.")
            print(f"Persona 1: {personas[0]['name']}")
        else:
            print(f"FAILED: Expected 2 personas, got {len(personas) if personas else 'None'}")

def test_persist_active_dataset():
    print("\n--- Testing Dataset Persistence (Test 5) ---")
    import tempfile
    from core.state_manager import StateManager
    from ace_v3_entry import _persist_active_dataset

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        data_file = tmp_path / 'input.csv'
        data_file.write_text('col\n1\n', encoding='utf-8')
        run_dir = tmp_path / 'run'
        run_dir.mkdir()
        state = StateManager(str(run_dir))

        saved_path = _persist_active_dataset(state, str(data_file))
        expected_path = state.get_file_path('cleaned_uploaded.csv')

        if Path(saved_path).exists() and Path(saved_path).samefile(expected_path):
            active = state.read('active_dataset')
            if active and active.get('path') == saved_path:
                print('PASSED: Dataset persisted to run directory.')
                assert True
                return
        print('FAILED: Dataset persistence validation failed.')
        assert False

if __name__ == "__main__":
    test_persona_json_extraction()
    test_persist_active_dataset()


def test_safe_upload_path_blocks_traversal(tmp_path, monkeypatch):
    monkeypatch.setattr(api_server, "DATA_DIR", tmp_path)
    safe_path = api_server._safe_upload_path("../evil.csv")
    assert safe_path.parent == tmp_path
    assert ".." not in safe_path.name
    assert safe_path.suffix == ".csv"



def test_safe_upload_path_generates_unique_names(tmp_path, monkeypatch):
    monkeypatch.setattr(api_server, "DATA_DIR", tmp_path)
    first = api_server._safe_upload_path("data.csv")
    second = api_server._safe_upload_path("data.csv")
    assert first != second
    assert first.suffix == second.suffix == ".csv"

