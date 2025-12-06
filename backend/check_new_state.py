import requests
import json

def check_state():
    endpoints = ["profile", "clusters", "risk_bands", "anomalies"]
    for ep in endpoints:
        try:
            res = requests.get(f"http://localhost:8000/read/{ep}")
            data = res.json()
            print(f"--- {ep.upper()} ---")
            if ep == "profile":
                print(f"Keys: {list(data.keys())[:5]}...")
            elif ep == "clusters":
                print(f"K: {data.get('k')}")
                print(f"Silhouette: {data.get('silhouette')}")
                print(f"Fingerprints keys: {list(data.get('fingerprints', {}).keys())}")
            elif ep == "risk_bands":
                print(f"Sample: {list(data.items())[:3]}")
            elif ep == "anomalies":
                print(f"Total Count: {data.get('total_count')}")
                print(f"High Value Indices: {len(data.get('high_value_indices', []))}")
        except Exception as e:
            print(f"Error reading {ep}: {e}")

if __name__ == "__main__":
    check_state()
