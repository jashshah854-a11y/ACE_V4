
import sys
import os
from pathlib import Path

# Print current environment info
print(f"CWD: {os.getcwd()}")
print(f"Python: {sys.executable}")

# Add current directory to path (simulating what we expect)
sys.path.append(os.getcwd())

try:
    print("Attempting to import ace_v3_entry...")
    import ace_v3_entry
    print(f"Module imported: {ace_v3_entry}")
    
    print("Attempting to import run_ace_v3...")
    from ace_v3_entry import run_ace_v3
    print("Function imported successfully.")
    
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()
