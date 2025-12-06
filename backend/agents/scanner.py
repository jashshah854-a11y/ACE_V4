import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from core.state_manager import StateManager
from schema_scanner.scanner import scan_dataset

class ScannerAgent:
    def __init__(self, schema_map, state: StateManager):
        self.state = state
        # Scanner doesn't need schema_map as it creates the scan
        self.schema_map = schema_map 

    def run(self):
        # Get data path from state or default
        data_path = self.state.get_file_path("cleaned_uploaded.csv")
        if not Path(data_path).exists():
            # Fallback to default for testing
            data_path = "data/customer_data.csv"
            
        print(f"Scanning: {data_path}")
        scan = scan_dataset(data_path)
        self.state.write("schema_scan_output", scan)
        print("Scanner complete.")

    def fallback(self, error):
        print(f"Scanner failed: {error}")
        return {
            "error": str(error),
            "status": "failed",
            "columns": [],
            "row_count": 0,
            "column_count": 0
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python scanner.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)

    # Scanner is the first step, so schema_map might be None
    agent = ScannerAgent(schema_map=None, state=state)
    try:
        agent.run()
    except Exception as e:
        fallback_output = agent.fallback(e)
        state.write("schema_scan_output", fallback_output)

if __name__ == "__main__":
    main()
