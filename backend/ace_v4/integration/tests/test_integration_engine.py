import pandas as pd
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from ace_v4.integration.engine import IntegrationEngine

def create_test_data():
    data_dir = Path("data/test_integration")
    data_dir.mkdir(exist_ok=True, parents=True)
    
    # 1. Parent (Customers)
    customers = pd.DataFrame({
        "cust_id": [101, 102],
        "name": ["Alice", "Bob"]
    })
    customers.to_csv(data_dir / "customers.csv", index=False)
    
    # 2. Child (Orders) - Orphan 103
    orders = pd.DataFrame({
        "order_id": [1, 2, 3],
        "cust_id": [101, 102, 103],
        "amount": [100, 200, 300]
    })
    orders.to_csv(data_dir / "orders.csv", index=False)
    
    # 3. Summary (Mismatched Total)
    summary = pd.DataFrame({
        "amount": [1000] # Fact total is 600
    })
    summary.to_csv(data_dir / "summary.csv", index=False)
    
    return {
        "customers": {"name": "customers", "path": str(data_dir / "customers.csv"), "type": "customer_dimension"},
        "orders": {"name": "orders", "path": str(data_dir / "orders.csv"), "type": "transaction_fact"},
        "summary": {"name": "summary", "path": str(data_dir / "summary.csv"), "type": "summary_table"}
    }, [
        {"parent": "customers", "child": "orders", "key": "cust_id"}
    ]

def test_integration_engine():
    print("=== Testing ACE V4 Integration Engine ===")
    
    tables, rels = create_test_data()
    
    # IntegrationEngine needs schema_graph in init
    engine = IntegrationEngine(schema_graph=rels)
    
    # run takes master_dataset dict
    master_dataset = {
        "tables": tables,
        "relationships": rels
    }
    issues = engine.run(master_dataset)
    
    print(f"Found {len(issues)} issues.")
    for issue in issues:
        print(f"- [{issue.issue_type}] {issue.description}")
        
    # Assertions
    types = [i.issue_type for i in issues]
    
    # 1. Referential Integrity (Orphan 103)
    assert "referential_integrity" in types
    print("✅ Referential Integrity Check Passed")
    
    # 2. Summary Mismatch (1000 vs 600)
    assert "summary_mismatch" in types
    print("✅ Summary Mismatch Check Passed")

if __name__ == "__main__":
    test_integration_engine()
