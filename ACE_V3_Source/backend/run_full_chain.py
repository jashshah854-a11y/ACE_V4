"""
Run full ACE chain and verify report generation
"""
import os
import shutil
import subprocess
import time
import json
from pathlib import Path

def prepare_run_path(base_dir: Path) -> Path:
    """
    Pick or create a run_path so agents get their required state files.
    Reuses an existing sample run if present; otherwise makes a fresh copy.
    """
    runs_dir = base_dir / "data" / "runs"
    sample_run = runs_dir / "6dcf4b87"
    if sample_run.exists():
        return sample_run

    runs_dir.mkdir(parents=True, exist_ok=True)
    new_run = runs_dir / "debug-run"
    new_run.mkdir(exist_ok=True)

    # Seed with any available sample data
    sample_clean = base_dir / "data" / "3db18a6016ef435a9bcfb14f663ba574.csv"
    if sample_clean.exists():
        shutil.copy(sample_clean, new_run / "cleaned_uploaded.csv")
    return new_run


def run_agent(name, script, run_path: Path):
    base_dir = Path(__file__).parent
    script_path = (base_dir / script).resolve()
    print(f"\n🚀 Running {name}...")

    env = os.environ.copy()
    pythonpath_parts = [
        env.get("PYTHONPATH", ""),
        str(base_dir),
        str(base_dir.parent),
        r"C:\Users\jashs\.gemini\antigravity\scratch\ace_v2",
    ]
    env["PYTHONPATH"] = os.pathsep.join([p for p in pythonpath_parts if p])

    result = subprocess.run(
        ["venv/Scripts/python.exe", str(script_path), str(run_path)],
        cwd=base_dir,
        capture_output=True,
        text=True,
        env=env,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"❌ {name} failed:")
        print(result.stderr)
        return False
    return True

def main():
    base_dir = Path(__file__).parent
    run_path = prepare_run_path(base_dir)

    # Ensure active_dataset metadata exists for downstream agents (expositor/enhanced analytics)
    active_dataset_path = Path(run_path) / "active_dataset.json"
    if not active_dataset_path.exists():
        active_dataset = {
            "path": str(Path(run_path) / "cleaned_uploaded.csv"),
            "source": str(Path(run_path) / "cleaned_uploaded.csv"),
            "strategy": "debug-run",
        }
        active_dataset_path.write_text(json.dumps(active_dataset, indent=2), encoding="utf-8")

    agents = [
        ("Overseer", "agents/overseer.py"),
        ("Sentry", "agents/sentry.py"),
        ("Persona Engine", "agents/persona_engine.py"),
        ("Fabricator", "agents/fabricator.py"),
        ("Expositor", "agents/expositor.py"),
    ]
    
    for name, script in agents:
        if not run_agent(name, script, run_path):
            print(f"\n⚠️  Chain stopped at {name}")
            return
    
    print("\n✅ Full chain executed successfully!")
    
    # Verify report
    report_path = base_dir / "data" / "ace_v2_report.json"
    run_report_md = run_path / "final_report.md"
    run_report_json = run_path / "final_report.json"
    run_report_txt = run_path / "final_report.txt"
    run_report_html = run_path / "final_report.html"

    report = None
    report_markdown = None

    if run_report_json.exists():
        with open(run_report_json) as f:
            loaded = json.load(f)
            if isinstance(loaded, str):
                report_markdown = loaded
            else:
                report = loaded
    elif report_path.exists():
        with open(report_path) as f:
            loaded = json.load(f)
            if isinstance(loaded, str):
                report_markdown = loaded
            else:
                report = loaded

    if report:
        print("\n📊 Report Summary:")
        print(f"  Title: {report.get('title')}")
        print(f"  Generated: {report.get('generated_at')}")
        print(f"  Clusters: {report.get('data_sources', {}).get('clusters')}")
        print(f"  Personas: {report.get('data_sources', {}).get('personas')}")
        print(f"  Strategies: {report.get('data_sources', {}).get('strategies')}")
        print(f"  Validation: {report.get('metadata', {}).get('validation_passed')}")
        print(f"\n  Report Length: {len(report.get('report_text', ''))} chars")
    elif report_markdown:
        print("\nℹ️ Report content is markdown (loaded from JSON string).")
        print(f"  Length: {len(report_markdown)} chars")
        print(f"  Source: {run_report_json if run_report_json.exists() else report_path}")
        print(f"  Markdown file: {run_report_md if run_report_md.exists() else 'n/a'}")
    elif run_report_md.exists():
        print("\nℹ️ Report markdown available at:")
        print(f"  {run_report_md}")
    else:
        print("\n❌ Report file not found (checked JSON + MD).")

if __name__ == "__main__":
    main()
