import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from intake.fusion import IntakeFusion


def test_fusion_includes_key_health(tmp_path):
    run_path = tmp_path
    fusion = IntakeFusion(str(run_path))

    primary_path = run_path / "cust.csv"
    pd.DataFrame({"id": range(10), "val": range(10)}).to_csv(primary_path, index=False)

    tables = [
        {
            "name": "cust",
            "type": "customer_dimension",
            "path": str(primary_path),
            "row_count": 10,
            "columns": ["id", "val"],
            "grain": "per_customer",
        }
    ]

    relationships = []

    result = fusion.fuse(tables, relationships)
    assert result["fusion_status"] == "ok"
    assert "validation" in result
    assert "key_health" in result["validation"]




