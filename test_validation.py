import requests
from pathlib import Path

# Test the relaxed validation by submitting with minimal data
url = "http://localhost:8001/run"
csv_file = Path("data/test_sets/ecommerce_realistic.csv")

files = {
    'file': ('test.csv', open(csv_file, 'rb'), 'text/csv')
}

# Minimal task intent - should now work with defaults
data = {
    'task_intent': '{"primary_question":"analyze data","decision_context":"business needs","required_output_type":"descriptive","success_criteria":"insights","constraints":"none","confidence_threshold":0.7}',
    'confidence_acknowledged': 'true'
}

print("Testing relaxed validation with minimal input...")
print(f"Submitting {csv_file} to {url}...")

response = requests.post(url, files=files, data=data)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    result = response.json()
    print(f"\n✓ Validation relaxed successfully!")
    print(f"Run ID: {result['run_id']}")
    print(f"\nOpen http://localhost:8080/reports?run={result['run_id']} to see the report")
else:
    print(f"\n✗ Still getting validation error")
    print("The backend may not have reloaded the changes yet")
