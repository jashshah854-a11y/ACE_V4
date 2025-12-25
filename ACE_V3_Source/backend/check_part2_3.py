import requests
import json

def check_state():
    endpoints = ["personas", "strategies", "narrative"]
    for ep in endpoints:
        try:
            res = requests.get(f"http://localhost:8000/read/{ep}")
            data = res.json()
            print(f"--- {ep.upper()} ---")
            if ep == "personas":
                personas = data.get("personas", [])
                print(f"Count: {len(personas)}")
                if not personas:
                    print(f"DEBUG: Personas Data Keys: {list(data.keys())}")
                if personas:
                    p = personas[0]
                    print(f"Sample Name: {p.get('name')}")
                    print(f"Snapshot Keys: {list(p.get('snapshot', {}).keys())}")
            elif ep == "strategies":
                strategies = data.get("strategies", [])
                print(f"Count: {len(strategies)}")
                if strategies:
                    s = strategies[0]
                    print(f"Persona: {s.get('persona_name')}")
                    plays = s.get("plays", [])
                    print(f"Plays Count: {len(plays)}")
                    if plays:
                        play = plays[0]
                        print(f"Top Play Type: {play.get('type')}")
                        print(f"Scores: Rev={play.get('revenue_lift_score')}, Risk={play.get('risk_reduction_score')}")
            elif ep == "narrative":
                print(f"Narrative Length: {len(data)}")
        except Exception as e:
            print(f"Error reading {ep}: {e}")

if __name__ == "__main__":
    check_state()
