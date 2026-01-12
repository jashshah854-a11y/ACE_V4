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
        dataset_info = self.state.read("active_dataset") or {}
        data_path = dataset_info.get("source") or dataset_info.get("path") or self.state.get_file_path("cleaned_uploaded.csv")
        if not Path(data_path).exists():
            # Fallback to default for testing
            data_path = "data/customer_data.csv"
            
        print(f"Scanning: {data_path}")
        scan = scan_dataset(data_path)
        self.state.write("schema_scan_output", scan)

        # Compute quality score (0-1 scale)
        columns = scan.get("columns", {})
        max_null_pct = max((col.get("null_pct") or 0 for col in columns.values()), default=0)
        avg_null_pct = sum((col.get("null_pct") or 0 for col in columns.values())) / len(columns) if columns else 0
        
        # DEBUG LOGGING: Track quality calculation components
        print(f"[SCANNER DEBUG] Quality Score Calculation:", flush=True)
        print(f"  - Max Null %: {max_null_pct:.3f}", flush=True)
        print(f"  - Avg Null %: {avg_null_pct:.3f}", flush=True)
        print(f"  - Column Count: {len(columns)}", flush=True)
        
        # Base completeness score
        completeness = 1.0 - avg_null_pct
        print(f"  - Completeness (1 - avg_null): {completeness:.3f}", flush=True)
        
        # Penalty for high max null
        if max_null_pct > 0.5:
            completeness *= 0.8
            print(f"  - Penalty applied (max_null > 0.5): {completeness:.3f}", flush=True)
        
        # CRITICAL FIX: Ensure minimum floor
        # Even "bad" data should score 0.4-0.5, not 0.0
        quality_score = max(0.4, completeness)
        
        print(f"[SCANNER DEBUG] Final Quality Score: {quality_score:.3f}", flush=True)
        
        if quality_score == 0.4:
            print(f"[SCANNER WARNING] Quality score hit minimum floor (0.4). Original: {completeness:.3f}", flush=True)

        scan["quality_score"] = quality_score
        self.state.write("schema_scan_output", scan)
        print("Scanner complete.")

    def fallback(self, error):
        print(f"Scanner failed: {error}")
        return {
            "error": str(error),
            "status": "failed",
            "columns": {}, # Changed from [] to {} to match scan output structure
            "row_count": 0,
            "column_count": 0,
            "quality_score": 0.0 # Added quality score to fallback
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
        print(f"[ERROR] Scanner agent failed: {e}")
        fallback_output = agent.fallback(e)
        state.write("schema_scan_output", fallback_output)
        sys.exit(1)

if __name__ == "__main__":
    main()
