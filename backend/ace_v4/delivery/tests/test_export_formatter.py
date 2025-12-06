import sys
from pathlib import Path
import json

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.delivery.export_formatter import ExportFormatter

def test_export_formatter():
    summary_block = {
        "tables": 5,
        "total_rows": 1000
    }
    
    sections = {
        "schema": "Schema details...",
        "anomalies": "Anomaly details...",
        "versions": "Version details..."
    }
    
    formatter = ExportFormatter()
    
    # Test JSON
    json_out = formatter.to_json(summary_block, sections)
    data = json.loads(json_out)
    assert data["summary"]["tables"] == 5
    
    # Test Markdown
    md_out = formatter.to_markdown(summary_block, sections)
    assert "# ACE V4 Insight Report" in md_out
    assert "**Tables:** 5" in md_out
    assert "## Anomalies" in md_out
    
    # Test Text
    text_out = formatter.to_text(summary_block, sections)
    assert "ACE Insight Report" in text_out
    assert "Tables: 5" in text_out
    
    print("✅ test_export_formatter passed")

if __name__ == "__main__":
    test_export_formatter()
