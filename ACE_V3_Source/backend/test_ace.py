"""
ACE V2.3 Local Test Runner
Executes the full agent chain to demonstrate the new consulting-grade intelligence
"""
import subprocess
import sys
import time

def run_agent(name, script):
    """Run an agent and show its output"""
    print(f"\n{'='*60}")
    print(f"🚀 Running {name}")
    print(f"{'='*60}")
    
    result = subprocess.run(
        ["venv/Scripts/python.exe", script],
        cwd=".",
        capture_output=True,
        text=True,
        env={"PYTHONPATH": "C:\\Users\\jashs\\.gemini\\antigravity\\scratch\\ace_v2"}
    )
    
    print(result.stdout)
    if result.returncode != 0:
        print(f"❌ Error:")
        print(result.stderr)
        return False
    return True

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║            ACE V2.3 - Full Chain Test                     ║
    ║                                                           ║
    ║  Testing Section 3 & 4 enhancements:                      ║
    ║  • 3-score impact system (revenue/risk/engagement)        ║
    ║  • Strategy memo (6 sections)                             ║
    ║  • 4-sentence executive summary                           ║
    ║  • Portfolio snapshot table                               ║
    ║  • 30/90/365 day action roadmap                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    agents = [
        ("Overseer (Clustering & Fingerprints)", "agents/overseer.py"),
        ("Sentry (Anomaly Detection)", "agents/sentry.py"),
        ("Persona Engine (Rigid Templates)", "agents/persona_engine.py"),
        ("Fabricator (Strategy Intelligence)", "agents/fabricator.py"),
        ("Expositor (Consulting Report)", "agents/expositor.py")
    ]
    
    for name, script in agents:
        if not run_agent(name, script):
            print(f"\n⚠️  Chain stopped at {name}")
            return
        time.sleep(1)
    
    print("""
    \n╔═══════════════════════════════════════════════════════════╗
    ║                   ✅ Full Chain Complete!                  ║
    ║                                                           ║
    ║  Generated files:                                          ║
    ║  → data/ace_v2_report.json                                 ║
    ║                                                           ║
    ║  Check the report for:                                     ║
    ║  • Executive Summary (4 sentences)                         ║
    ║  • Portfolio Snapshot (table format)                       ║
    ║  • Strategy Memo (6 sections)                              ║
    ║  • Action Roadmap (30/90/365 days)                         ║
    ║  • Closing Insight                                         ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

if __name__ == "__main__":
    main()
