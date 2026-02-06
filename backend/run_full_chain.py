"""
Run full ACE chain and verify report generation
"""
import subprocess
import time
import json
from pathlib import Path

def run_agent(name, script):
    print(f"\n🚀 Running {name}...")
    result = subprocess.run(
        ["venv/Scripts/python.exe", script],
        cwd=".",
        capture_output=True,
        text=True,
        env={"PYTHONPATH": "C:\\Users\\jashs\\.gemini\\antigravity\\scratch\\ace_v2"}
    )
    print(result.stdout)
    if result.returncode != 0:
        print(f"❌ {name} failed:")
        print(result.stderr)
        return False
    return True

def main():
    agents = [
        ("Overseer", "agents/overseer.py"),
        ("Sentry", "agents/sentry.py"),
        ("Persona Engine", "agents/persona_engine.py"),
        ("Fabricator", "agents/fabricator.py"),
        ("Expositor", "agents/expositor.py")
    ]
    
    for name, script in agents:
        if not run_agent(name, script):
            print(f"\n⚠️  Chain stopped at {name}")
            return
    
    print("\n✅ Full chain executed successfully!")
    
    # Verify report
    report_path = Path("data/ace_v2_report.json")
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        
        print("\n📊 Report Summary:")
        print(f"  Title: {report.get('title')}")
        print(f"  Generated: {report.get('generated_at')}")
        print(f"  Clusters: {report.get('data_sources', {}).get('clusters')}")
        print(f"  Personas: {report.get('data_sources', {}).get('personas')}")
        print(f"  Strategies: {report.get('data_sources', {}).get('strategies')}")
        print(f"  Validation: {report.get('metadata', {}).get('validation_passed')}")
        print(f"\n  Report Length: {len(report.get('report_text', ''))} chars")
    else:
        print("\n❌ Report file not found!")

if __name__ == "__main__":
    main()
