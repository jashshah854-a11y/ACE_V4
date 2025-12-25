import requests
try:
    persona = requests.get("http://localhost:8000/read/persona").json()
    strategy = requests.get("http://localhost:8000/read/strategy").json()
    
    print(f"Persona keys: {list(persona.keys()) if persona else 'None'}")
    print(f"Strategy keys: {list(strategy.keys()) if strategy else 'None'}")
except Exception as e:
    print(f"Error: {e}")
