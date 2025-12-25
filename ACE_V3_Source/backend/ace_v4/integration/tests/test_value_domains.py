import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.integration.value_domains import ValueDomainChecker


def test_value_domain_conflict():
    table_a = pd.DataFrame({
        "status": ["ACTIVE", "NEW", "CANCELLED"]
    })

    table_b = pd.DataFrame({
        "status": ["ACTV", "NEW", "CANC"]
    })

    tables = {
        "table_a": table_a,
        "table_b": table_b
    }

    checker = ValueDomainChecker()

    issues = checker.run(tables)

    assert len(issues) == 1
    issue = issues[0]

    assert issue.issue_type == "value_conflict"
    assert issue.key_column == "status"
    assert "table_a" in issue.tables_involved
    assert "table_b" in issue.tables_involved
    assert issue.metric > 0
    assert len(issue.sample_keys) > 0
    print("✅ test_value_domain_conflict passed")

if __name__ == "__main__":
    test_value_domain_conflict()
