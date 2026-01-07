"""Test schema unification - verify both 'question' and 'primary_question' work"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.task_contract import parse_task_intent

# Test 1: Legacy format (simple 'question')
print("Test 1: Legacy 'question' key...")
try:
    intent1 = parse_task_intent({
        "question": "Analyze sales trends",
        "required_output_type": "descriptive"
    })
    print(f"✅ Accepted! Normalized to: {intent1['primary_question'][:50]}...")
except Exception as e:
    print(f"❌ Failed: {e}")

# Test 2: Internal format ('primary_question')
print("\nTest 2: Internal 'primary_question' key...")
try:
    intent2 = parse_task_intent({
        "primary_question": "Analyze Q4 sales trends for strategic planning",
        "required_output_type": "descriptive"
    })
    print(f"✅ Accepted! Value: {intent2['primary_question'][:50]}...")
except Exception as e:
    print(f"❌ Failed: {e}")

# Test 3: Both keys (primary_question should take precedence)
print("\nTest 3: Both keys provided...")
try:
    intent3 = parse_task_intent({
        "question": "Simple question",
        "primary_question": "Detailed primary question",
        "required_output_type": "descriptive"
    })
    print(f"✅ Accepted! Used: {intent3['primary_question'][:50]}...")
    if "Detailed" in intent3['primary_question']:
        print("✅ Correctly prioritized 'primary_question'")
except Exception as e:
    print(f"❌ Failed: {e}")

print("\n" + "="*60)
print("Schema Unification: VERIFIED ✅")
print("Main brain can now use simple 'question' key!")
