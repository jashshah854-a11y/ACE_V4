import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.integration.referential import ReferentialIntegrityChecker
from ace_v4.integration.models import RelationshipEdge


def test_referential_orphans_detected():
    customers = pd.DataFrame({
        "customer_id": [1, 2, 3]
    })

    transactions = pd.DataFrame({
        "customer_id": [1, 2, 4, 5],
        "amount": [10, 20, 30, 40]
    })

    tables = {
        "customers": customers,
        "transactions": transactions
    }

    edge = RelationshipEdge(
        parent_table="customers",
        child_table="transactions",
        parent_key="customer_id",
        child_key="customer_id",
    )

    checker = ReferentialIntegrityChecker(orphan_threshold=0.0)
    issues = checker.run(tables, [edge])

    assert len(issues) == 1
    issue = issues[0]
    assert issue.issue_type == "referential_integrity"
    # there are two orphans out of four child rows
    assert abs(issue.metric - 0.5) < 1e-6
    assert {"transactions", "customers"} == set(issue.tables_involved)
    assert "customer_id" == issue.key_column
    assert set(issue.sample_keys) == {"4", "5"}
    print("✅ test_referential_orphans_detected passed")

if __name__ == "__main__":
    test_referential_orphans_detected()
