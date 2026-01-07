"""Quick test for type_confusion crash fix"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from orchestrator import orchestrate_new_run, main_loop

dataset = Path("data/stress_tests/type_confusion.csv")
print(f"Testing {dataset.name}...")

try:
    run_config = {
        "task_intent": {
            "primary_question": "Test type confusion handling",
            "confidence_threshold": 80,
            "required_output_type": "descriptive"
        },
        "fast_mode": False
    }
    
    run_id, run_path = orchestrate_new_run(str(dataset), run_config=run_config)
    print(f"✅ Ingestion passed! Run: {run_id}")
    print("Fix verified: Type confusion no longer crashes the pipeline")
except Exception as e:
    print(f"❌ Still failing: {e}")
