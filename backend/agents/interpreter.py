import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from agents.schema_interpreter import SchemaInterpreter
from core.schema import SchemaMap

class InterpreterAgent:
    def __init__(self, schema_map, state: StateManager):
        self.state = state
        self.schema_map = schema_map # Not used, we create it

    def run(self):
        scan = self.state.read("schema_scan_output")
        if not scan:
            raise ValueError("No scan output found.")

        interpreter = SchemaInterpreter()
        schema_map_dict = interpreter.run(scan)

        if not schema_map_dict:
            raise ValueError("Schema interpretation failed")

        try:
            schema_map = SchemaMap(**schema_map_dict)
        except Exception as e:
            print(f"Schema validation warning: {e}")
            schema_map = schema_map_dict

        self.state.write("schema_map", schema_map)
        print("Interpreter complete.")

    def fallback(self, error):
        print(f"Interpreter failed: {error}")
        return {
            "semantic_roles": {},
            "domain_guess": "unknown",
            "notes": f"Fallback due to error: {error}"
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python interpreter.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)

    agent = InterpreterAgent(schema_map=None, state=state)
    try:
        agent.run()
    except Exception as e:
        fallback_output = agent.fallback(e)
        state.write("schema_map", fallback_output)

if __name__ == "__main__":
    main()
