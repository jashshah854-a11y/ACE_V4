"""
Direct Backend Connection Test

Tests if the backend is reachable and the /runs/preview endpoint works.
"""

import requests
import pandas as pd
import io

# Test both local and production
BACKENDS = {
    "local": "http://localhost:8000",
    "production": "https://ace-v4-production.up.railway.app"
}

def test_health(backend_name, base_url):
    """Test if backend is alive"""
    print(f"\n=== Testing {backend_name} Backend ===")
    print(f"URL: {base_url}")
    
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.text}")
            return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    return False

def test_preview(backend_name, base_url):
    """Test the /runs/preview endpoint"""
    print(f"\n=== Testing {backend_name} /runs/preview ===")
    
    # Create a simple test CSV
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "value": [10, 20, 30, 40, 50],
        "category": ["A", "B", "A", "B", "C"]
    })
    
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    try:
        files = {"file": ("test.csv", csv_buffer, "text/csv")}
        response = requests.post(f"{base_url}/runs/preview", files=files, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Preview successful!")
            print(f"   Rows: {data.get('row_count')}")
            print(f"   Columns: {data.get('column_count')}")
            print(f"   Quality Score: {data.get('quality_score')}")
            return True
        else:
            print(f"❌ Preview failed")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"❌ Preview request failed: {e}")
    return False

def main():
    print("=" * 60)
    print("Backend Connection Diagnostic")
    print("=" * 60)
    
    for name, url in BACKENDS.items():
        if test_health(name, url):
            test_preview(name, url)
    
    print("\n" + "=" * 60)
    print("Diagnostic Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
