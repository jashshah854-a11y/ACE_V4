import requests
from pathlib import Path

# Submit a test run to local API
url = "http://localhost:8001/run"
csv_file = Path("data/test_sets/ecommerce_realistic.csv")

files = {
    'file': ('ecommerce_small.csv', open(csv_file, 'rb'), 'text/csv')
}

data = {
    'task_intent': '{"primary_question":"Segment ecommerce customers based on purchasing behavior patterns to enable targeted marketing campaigns","decision_context":"Planning quarterly marketing budget allocation across customer segments to maximize revenue growth and customer lifetime value metrics","required_output_type":"descriptive","success_criteria":"Distinct customer segments with clear behavioral characteristics and actionable targeting recommendations","constraints":"Focus on purchase frequency and monetary value patterns excluding promotional campaign data","confidence_threshold":0.7}',
    'confidence_acknowledged': 'true'
}

print(f"Submitting {csv_file} to {url}...")
response = requests.post(url, files=files, data=data)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    result = response.json()
    print(f"\n✓ Run submitted successfully!")
    print(f"Run ID: {result.get('run_id')}")
    print(f"Run Path: {result.get('run_path')}")
    print(f"\nNow open http://localhost:8080/report/{result.get('run_id')} to watch the pipeline status")
