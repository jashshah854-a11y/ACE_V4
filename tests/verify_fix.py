
import sys
import os
from pathlib import Path

# Add backend to path (simulating how uvicorn might run or how server.py is structured)
# We need to simulate running from backend/api/server.py
backend_path = Path("backend").absolute()
sys.path.append(str(backend_path))

print(f"Testing environment...")
print(f"CWD: {os.getcwd()}")

try:
    # Simulate server.py imports and logic
    print("Attempting to import api.server...")
    
    # We need to set up the path so api.server can verify imports
    # In server.py we do: sys.path.append(str(Path(__file__).parent.parent))
    # mimicking that:
    
    from backend.api import server
    
    print(f"✅ Import Successful: backend.api.server")
    print(f"✅ DATA_DIR resolved to: {server.DATA_DIR}")
    
    expected_suffix = "backend\\data" if os.name == 'nt' else "backend/data"
    if str(server.DATA_DIR).endswith(expected_suffix):
         print("✅ DATA_DIR is correctly anchored to backend/data")
    else:
         print(f"❌ DATA_DIR PATH MISMATCH. Expected ...{expected_suffix}")

    # Verify Redis Import logic manually
    try:
        from backend.jobs import redis_queue
        print("✅ jobs.redis_queue is importable via backend package")
    except ImportError as e:
        print(f"❌ Failed to import backend.jobs.redis_queue: {e}")

except Exception as e:
    print(f"❌ Verification Failed: {e}")
    import traceback
    traceback.print_exc()
