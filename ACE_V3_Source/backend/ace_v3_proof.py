import sys
import json
import argparse
from pathlib import Path
from ace_v3_entry import run_ace_v3
from utils.logging import log_info, log_error, log_ok, log_section, log_warn, log_step

def print_header(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_section(title):
    print(f"\n--- {title} ---")

def generate_proof_report(data_path):
    print_header(f"ACE V3 PROOF MODE: {Path(data_path).name}")
    
    # Run the engine
    output = run_ace_v3(data_path)
    
    if not output:
        log_error("ACE V3 Execution Failed.")
        return

    schema_map = output.get("schema_map", {})
    fingerprints = output.get("fingerprints", {})
    stats = output.get("stats", {})
    
    # --- SECTION 1: UNIVERSAL SCHEMA UNDERSTANDING ---
    print_header("1. UNIVERSAL SCHEMA UNDERSTANDING")
    
    domain = schema_map.get("domain_guess", {})
    print(f"[DOMAIN] Domain Guess: {domain.get('domain', 'Unknown').upper()} (Confidence: {domain.get('confidence', 0):.2f})")
    
    print_section("Semantic Roles")
    roles = schema_map.get("semantic_roles", {})
    for role, cols in roles.items():
        if cols:
            print(f"  • {role}: {cols}")
            
    print_section("Feature Plan")
    plan = schema_map.get("feature_plan", {})
    print(f"  • Clustering: {plan.get('clustering_features', [])}")
    print(f"  • Risk:       {plan.get('risk_features', [])}")
    print(f"  • Personas:   {plan.get('persona_features', [])}")
    
    print_section("Normalization Plan")
    norm = schema_map.get("normalization_plan", {})
    for col, method in norm.items():
        print(f"  • {col}: {method}")

    # --- SECTION 2: UNIVERSAL CLUSTERING ---
    print_header("2. UNIVERSAL CLUSTERING")
    
    k = stats.get("k", 0)
    sil = stats.get("silhouette", 0)
    print(f"[CLUSTERS] Clusters Found: {k}")
    print(f"[STATS] Silhouette Score: {sil:.4f}")
    
    print_section("Cluster Fingerprints")
    for cid, fp in fingerprints.items():
        size = fp.get("size", 0)
        print(f"\n[GROUP] {cid.upper()} (Size: {size})")
        
        # Role Summaries
        summaries = fp.get("role_summaries", {})
        for role, val in summaries.items():
            # Format based on magnitude
            val_str = f"{val:,.2f}"
            print(f"   - {role}: {val_str}")
            
        # Top defining features (variance from global mean could be cool, but raw mean for now)
        means = fp.get("feature_means", {})
        # Just show top 3 for brevity if many
        print("   - Key Features:")
        for i, (f, v) in enumerate(means.items()):
            if i >= 5: break
            print(f"     • {f}: {v:,.2f}")

    # --- SECTION 3: UNIVERSAL PERSONAS ---
    print_header("3. UNIVERSAL PERSONAS")
    personas = output.get("personas", [])
    
    if not personas:
        log_warn("No personas generated.")
    else:
        for p in personas:
            print(f"\n[PERSONA] {p.get('name', 'Unknown')} ({p.get('label', '')})")
            print(f"   • Size: {p.get('persona_size', 0)}")
            print(f"   • Motivation: {p.get('motivation', '')}")
            print(f"   • Reasoning: {p.get('reasoning', '')}")

    # --- SECTION 4: UNIVERSAL STRATEGIES ---
    print_header("4. UNIVERSAL STRATEGIES")
    strategies_data = output.get("strategies", {})
    strategies_list = strategies_data.get("strategies", [])
    meta = strategies_data.get("meta", {})
    
    if not strategies_list:
        log_warn("No strategies generated.")
    else:
        print(f"Global Theme: {meta.get('global_theme', '')}\n")
        
        for s in strategies_list:
            print(f"[STRATEGY] STRATEGY: {s.get('strategy_name', 'Unknown')} (Priority: {s.get('priority_score', 0)})")
            print(f"    Target: {s.get('persona_name', 'Unknown')}")
            print(f"    Goal: {s.get('strategic_goal', '')}")
            print(f"    Why: {s.get('why_this_works', '')}")
            print("    Actions:")
            for act in s.get('actions', []):
                print(f"     - {act}")
            print(f"    Risk Play: {s.get('risk_play', '')}")
            print("")

        print_section("Strategic Horizon")
        print("30 Days:")
        for item in meta.get("time_horizon_30_days", []):
            print(f" - {item}")
        print("\n90 Days:")
        for item in meta.get("time_horizon_90_days", []):
            print(f" - {item}")
            
    # --- SECTION 5: FINAL REPORT ---
    print_header("5. FINAL REPORT")
    report_content = output.get("final_report", "")
    if report_content:
        log_ok("Final Report Generated: data/final_report.md")
        print("\n--- EXECUTIVE SUMMARY SNIPPET ---")
        # Print first 10 lines or until first header
        lines = report_content.split('\n')
        for line in lines[:15]:
            print(line)
        print("...\n(See full report for details)")
    else:
        log_warn("No Final Report found.")
    
    print("\n" + "="*60)
    log_ok("PROOF COMPLETE")
    print("="*60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run ACE V3 Proof Mode")
    parser.add_argument("dataset", nargs="?", default="data/customer_data.csv", help="Path to dataset CSV")
    args = parser.parse_args()
    
    generate_proof_report(args.dataset)
