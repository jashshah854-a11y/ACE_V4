import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from agents.validator import Validator
from core.state_manager import StateManager


def test_validator_blocks_on_drift(tmp_path):
    run_path = tmp_path
    run_path.mkdir(parents=True, exist_ok=True)

    # create dataset
    df = pd.DataFrame({"x": range(60), "target": range(60)})
    data_path = run_path / "cleaned_uploaded.csv"
    df.to_csv(data_path, index=False)

    sm = StateManager(str(run_path))
    sm.write("ingestion_meta", {"drift_status": "block"})

    report = Validator(sm).run()
    assert report["mode"] == "limitations"
    assert report["allow_insights"] is False
    assert "drift" in " ".join(report.get("notes", [])).lower()


