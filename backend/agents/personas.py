import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from agents.persona_engine import PersonaEngine
from core.schema import SchemaMap, ensure_schema_map

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python personas.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)

    try:
        # Load Schema
        schema_data = state.read("schema_map")
        if not schema_data:
            raise ValueError("Schema Map missing")

        schema_map = ensure_schema_map(schema_data)

        agent = PersonaEngine(schema_map=schema_map, state=state)
        agent.run()
        print("Personas complete.")

    except Exception as e:
        print(f"Personas failed: {e}")
        # Fallback logic is already inside PersonaEngine.run() but if that crashes:
        fallback = [{"name": "Fallback Persona", "reason": str(e)}]
        state.write("personas", {"personas": fallback})
