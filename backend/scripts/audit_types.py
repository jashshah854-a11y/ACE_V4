import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

try:
    from backend.core.data_typing import DATA_TYPE_CATALOG
    from backend.core.data_guardrails import SUPPORTED_DATA_TYPES, AGENT_ALLOWLIST
except ImportError as e:
    print(f"Error importing modules: {e}")
    print(f"PYTHONPATH: {sys.path}")
    sys.exit(1)

def audit_consistency():
    print("=== auditing data type consistency ===")
    
    producer_types = set(DATA_TYPE_CATALOG.keys())
    consumer_types = set(SUPPORTED_DATA_TYPES)
    
    print(f"Producer Types (data_typing): {len(producer_types)}")
    print(f"Consumer Types (guardrails): {len(consumer_types)}")
    
    # Check 1: detected types not in supported list
    unsupported = producer_types - consumer_types
    if unsupported:
        print("\n[CRITICAL] Types produced but NOT supported in guardrails (Will block pipeline):")
        for t in unsupported:
            print(f"  - {t}")
    else:
        print("\n[OK] All producer types are supported.")

    # Check 2: Supported types with no detection logic
    undefined = consumer_types - producer_types
    if undefined:
        print("\n[WARN] Types in guardrails with no detection logic (Dead code):")
        for t in undefined:
            # exclude 'mix' and 'unknown' which might be special cases
            if t not in ['mixed', 'unknown']:
                 print(f"  - {t}")
    
    # Check 3: Agent allowlist consistency
    print("\n=== auditing agent allowlist ===")
    for agent, allowed_types in AGENT_ALLOWLIST.items():
        invalid_types = set(allowed_types) - consumer_types
        if invalid_types:
             print(f"[WARN] Agent '{agent}' allows undefined types: {invalid_types}")

if __name__ == "__main__":
    audit_consistency()
