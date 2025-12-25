import argparse
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from ace_v3_entry import run_ace_v3

def main():
    parser = argparse.ArgumentParser(description="ACE V3: Autonomous Cognitive Entity Engine")
    parser.add_argument("data_path", help="Input CSV file path")
    args = parser.parse_args()

    print(f"ACE V3 Launching on: {args.data_path}")
    try:
        run_id, run_path = run_ace_v3(args.data_path)
        print(f"\nSUCCESS: Run complete.")
        print(f"Run ID: {run_id}")
        print(f"Report saved in: {run_path}/final_report.md")
    except Exception as e:
        print(f"\nFAILURE: ACE Engine crashed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
