import requests

try:
    requests.post("http://localhost:8000/write", json={
        "key": "test",
        "value": {"msg": "hello from ACE v2"}
    })

    response = requests.get("http://localhost:8000/read/test")
    print(response.json())
except Exception as e:
    print(f"Error: {e}")
