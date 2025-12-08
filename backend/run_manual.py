
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(os.getcwd())

from ace_v3_entry import run_ace_v3

# Path to sample data
data_path = r"C:\Users\jashs\.gemini\antigravity\brain\922ea58a-4c3f-4752-8570-6d69e93e960a\sample_customers.csv"

# Resolve absolute path
abs_data_path = str(Path(data_path).resolve())

print(f"Running ACE V3 on: {abs_data_path}")

try:
    run_id, run_path = run_ace_v3(abs_data_path)
    print(f"SUCCESS: Run ID {run_id}")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
