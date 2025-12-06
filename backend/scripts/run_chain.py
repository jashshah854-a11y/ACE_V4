import sys
import os

# Add the project root to sys.path to allow imports from api
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents import overseer, sentry, persona_engine, fabricator, expositor
import requests

STATE_URL = "http://localhost:8000"

def run_chain():
    print(overseer.run())
    print(sentry.run())
    print(persona_engine.run())
    print(fabricator.run())
    print(expositor.run())

    report = requests.get(f"{STATE_URL}/read/report").json()
    print("Final report:")
    print(report)

if __name__ == "__main__":
    run_chain()
