import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from intake.entry import IntakeSystem


def test_intake_entry_returns_fusion_meta(tmp_path):
    run_path = tmp_path
    csv_path = tmp_path / "simple.csv"
    pd.DataFrame({"id": [1, 2, 3], "val": [10, 20, 30]}).to_csv(csv_path, index=False)

    intake = IntakeSystem(str(run_path))
    result = intake.load_input(str(csv_path))

    assert "fusion_status" in result
    assert result["fusion_status"] in {"ok", None}
    assert Path(result["master_dataset_path"]).exists()



