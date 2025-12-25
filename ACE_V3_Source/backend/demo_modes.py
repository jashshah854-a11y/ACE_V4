"""
ACE V2 Mode Switching Demo

This script demonstrates the 3 personality modes of the ACE Engine:
- Analyst Mode: Data-heavy, technical, statistical focus
- Strategist Mode: Action-oriented, plays, revenue focus (default)
- Founder Mode: Plain language, bottom-line, decision focus
"""
import subprocess
import sys

def run_mode(mode_name):
    """Run Expositor in specified mode"""
    print(f"\n{'='*60}")
    print(f"MODE: {mode_name.upper()}")
    print(f"{'='*60}\n")
    
    result = subprocess.run(
        ["venv/Scripts/python.exe", "agents/expositor.py", mode_name],
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
    ║              ACE V2 Mode Switching Demo                  ║
    ║                                                           ║
    ║  Showcasing 3 distinct AI personalities:                 ║
    ║  • Analyst    → Technical, data-heavy                     ║
    ║  • Strategist → Action-oriented, campaigns (default)      ║
    ║  • Founder    → Plain language, bottom-line               ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    modes = ["analyst", "strategist", "founder"]
    
    for mode in modes:
        if not run_mode(mode):
            print(f"\n⚠️  Demo stopped at {mode} mode")
            return
        input(f"\n✅ {mode.upper()} mode complete. Press Enter to continue...")
    
    print("""
    \n╔═══════════════════════════════════════════════════════════╗
    ║                   Demo Complete! 🎉                        ║
    ║                                                           ║
    ║  All 3 modes executed successfully.                       ║
    ║  Check data/ace_v2_report.json for the latest output.     ║
    ║                                                           ║
    ║  Interview Tip:                                            ║
    ║  "I built an intelligence engine with 3 personalities      ║
    ║   that can shift tone based on audience needs."           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

if __name__ == "__main__":
    main()
