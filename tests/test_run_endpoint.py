"""
Test the Railway backend /run endpoint with the exact payload the frontend sends
"""
import requests
import io
import json

# Production Railway backend
API_BASE = "https://ace-v4-production.up.railway.app"

def test_run_endpoint():
    """Test the /run endpoint with frontend-style payload"""
    print("=" * 60)
    print("Testing /run endpoint on Railway")
    print("=" * 60)
    
    # Create a simple CSV file
    csv_content = """id,value,category
1,10,A
2,20,B
3,30,A
4,40,B
5,50,C"""
    
    csv_file = io.BytesIO(csv_content.encode('utf-8'))
    
    # This is EXACTLY what the frontend sends (camelCase)
    task_intent = {
        "primaryQuestion": "What are the key patterns in this data?",
        "decisionContext": "Business analysis",
        "requiredOutputType": "diagnostic",
        "successCriteria": "Clear insights",
        "constraints": "",
        "confidenceThreshold": 80,
        "confidenceAcknowledged": True
    }
    
    # Prepare the request
    files = {
        'file': ('test.csv', csv_file, 'text/csv')
    }
    
    data = {
        'task_intent': json.dumps(task_intent),
        'confidence_acknowledged': 'true'
    }
    
    print(f"\nSending request to: {API_BASE}/run")
    print(f"Task intent: {json.dumps(task_intent, indent=2)}")
    
    try:
        response = requests.post(
            f"{API_BASE}/run",
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS! Run started")
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ FAILED with {response.status_code}")
            print(f"Response body: {response.text}")
            
            # Try to parse as JSON
            try:
                error_detail = response.json()
                print(f"Error detail: {json.dumps(error_detail, indent=2)}")
            except:
                pass
                
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_run_endpoint()
