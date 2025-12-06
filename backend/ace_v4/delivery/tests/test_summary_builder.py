import pandas as pd
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Any

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.delivery.summary_builder import SummaryBuilder

@dataclass
class MockMasterDataset:
    tables: Dict[str, pd.DataFrame]
    project_id: str = "test_project"
    integration_scores: Dict[str, float] = field(default_factory=dict)

@dataclass
class MockAnomaly:
    anomaly_type: str

@dataclass
class MockChange:
    change_type: str
    severity: str
    description: str

def test_summary_builder():
    # Mock data
    df = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    master = MockMasterDataset(tables={"table1": df}, integration_scores={"trust": 0.9})
    
    anomalies = [
        MockAnomaly(anomaly_type="outlier"),
        MockAnomaly(anomaly_type="outlier"),
        MockAnomaly(anomaly_type="referential")
    ]
    
    changes = [
        MockChange(change_type="schema", severity="high", description="Added column")
    ]
    
    builder = SummaryBuilder()
    block = builder.build(master, anomalies, changes)
    
    assert block["tables"] == 1
    assert block["total_rows"] == 2
    assert block["anomaly_overview"]["total"] == 3
    assert block["anomaly_overview"]["by_type"]["outlier"] == 2
    assert block["version_changes"][0]["description"] == "Added column"
    
    print("✅ test_summary_builder passed")

if __name__ == "__main__":
    test_summary_builder()
