import requests
try:
    anomalies = requests.get("http://localhost:8000/read/anomalies").json()
    print(f"Anomalies: {anomalies}")
except Exception as e:
    print(f"Error: {e}")
