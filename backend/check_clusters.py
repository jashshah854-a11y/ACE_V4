import requests
try:
    response = requests.get("http://localhost:8000/read/clusters")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")
