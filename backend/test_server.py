import requests
import time

STATE_URL = "http://localhost:8000"

def test():
    # Write
    print("Writing test data...")
    resp = requests.post(f"{STATE_URL}/write", json={
        "key": "test_key",
        "value": {"foo": "bar"}
    })
    print(f"Write Status: {resp.status_code}")
    
    # Read
    print("Reading test data...")
    resp = requests.get(f"{STATE_URL}/read/test_key")
    data = resp.json()
    print(f"Read Data: {data}")
    
    if data.get("foo") == "bar":
        print("SUCCESS: Server is working.")
    else:
        print("FAILURE: Data mismatch.")

if __name__ == "__main__":
    test()
