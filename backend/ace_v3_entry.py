from schema_scanner.scanner import scan_dataset, save_scan_output
from agents.schema_interpreter import SchemaInterpreter
from agents.overseer import Overseer
from core.schema_storage import save_schema_map
import json
import pandas as pd
import shutil
from pathlib import Path
from utils.logging import log_scan, log_info, log_error, log_ok, log_launch, log_warn
from core.run_utils import create_run_folder
from core.state_manager import StateManager
from agents.data_sanitizer import DataSanitizer


def _persist_active_dataset(state: StateManager, source_path: str) -> str:
    """Copy the working dataset into the run directory for downstream agents."""
    source = Path(source_path)
    if not source.exists():
        raise FileNotFoundError(f"Dataset not found: {source_path}")

    target = Path(state.get_file_path("cleaned_uploaded.csv"))
    target.parent.mkdir(parents=True, exist_ok=True)

    if source.resolve() != target.resolve():
        shutil.copyfile(source, target)

    state.write("active_dataset", {"path": str(target)})
    return str(target)



def _build_master_dataset(intake_result):
    try:
        from ace_v4.anomaly_engine.models import MasterDataset
    except Exception:
        return None

    if not intake_result:
        return None

    tables_meta = intake_result.get("tables", {}) or {}
    tables = {}
    for name, meta in tables_meta.items():
        file_path = meta.get("path")
        if file_path and Path(file_path).exists():
            try:
                tables[name] = pd.read_csv(file_path)
            except Exception:
                continue

    if not tables:
        return None

    relationships = intake_result.get("relationships", []) or []
    primary_table = intake_result.get("primary_table") or next(iter(tables.keys()))
    project_id = intake_result.get("project_id", "default")
    master_path = intake_result.get("master_dataset_path")

    return MasterDataset(
        tables=tables,
        relationships=relationships,
        primary_table=primary_table,
        project_id=project_id,
        master_dataset_path=master_path
    )

def run_ace_v3(data_path):
    print("=== ACE V3 UNIVERSAL ENGINE START ===")
    
    # Initialize Run
    run_id, run_path = create_run_folder()
    state = StateManager(run_path)
    print(f"[ACE] Run ID: {run_id}")
    print(f"[ACE] Run Path: {run_path}")

    # Ensure data path exists
    if not Path(data_path).exists():
        log_error(f"Data file not found: {data_path}")
        return run_id, run_path

    # Step 0: Intake System (V4)
    log_info(f"Starting Intake System for: {data_path}")
    try:
        from intake.entry import IntakeSystem
        intake = IntakeSystem(run_path)
        intake_result = intake.load_input(data_path)
        
        if "error" in intake_result:
            log_error(f"Intake failed: {intake_result['error']}")
            return run_id, run_path
            
        state.write("intake_result", intake_result)
        
        # Use the fused master dataset for the pipeline
        master_path = intake_result.get("master_dataset_path")
        if not master_path or not Path(master_path).exists():
             log_error("Intake did not produce a master dataset.")
             return run_id, run_path
             
        data_path = str(master_path)
        log_ok(f"Intake complete. Master dataset: {data_path}")
        
        # Step 0.5: Anomaly Engine (V4)
        log_info("Starting Anomaly Engine...")
        try:
            from ace_v4.anomaly_engine.engine import AnomalyEngine
            master_dataset = _build_master_dataset(intake_result)
            if not master_dataset:
                raise ValueError("Unable to build MasterDataset from intake result")

            anomaly_engine = AnomalyEngine(master_dataset=master_dataset)
            anomaly_result = anomaly_engine.run()

            cleaned_path = state.get_file_path("master_cleaned.csv")
            anomaly_result.cleaned_df.to_csv(cleaned_path, index=False)
            data_path = str(cleaned_path)

            state.write("anomaly_report", anomaly_result.anomalies_df.to_dict(orient="records"))
            state.write("anomaly_logs", anomaly_result.logs)

            anomaly_summary = {
                "total_anomalies": len(anomaly_result.anomalies_df),
                "types": anomaly_result.anomalies_df["anomaly_type"].value_counts().to_dict() if not anomaly_result.anomalies_df.empty else {}
            }
            state.write("anomaly_summary", anomaly_summary)

            log_ok(f"Anomaly Engine complete. Cleaned dataset: {data_path}")

        except Exception as e:
            log_error(f"Anomaly Engine failed: {e}")
            pass

    except Exception as e:
        log_error(f"Intake crashed: {e}")
        import traceback
        traceback.print_exc()
        return run_id, run_path

    # Persist dataset for downstream agents before scanning
    data_path = _persist_active_dataset(state, data_path)

    # Step 1: Scan dataset
    log_scan(f"Scanning dataset: {data_path}")
    scan = scan_dataset(data_path)
    state.write("schema_scan_output", scan)

    # Step 2: Interpret schema
    log_info("Interpreting schema...")
    interpreter = SchemaInterpreter()
    schema_map_dict = interpreter.run(scan)
    
    if not schema_map_dict:
        log_error("Schema interpretation failed.")
        return run_id, run_path

    # Convert dict back to Pydantic object for downstream agents
    from core.schema import SchemaMap
    try:
        schema_map = SchemaMap(**schema_map_dict)
    except Exception as e:
        log_warn(f"Schema validation warning: {e}")
        state.write("schema_map_validation_error", {"error": str(e)})
        schema_map = SchemaMap()

    # --- STEP 10: DOMAIN GUARD ---
    domain_value = (schema_map.domain_guess.domain or "").lower()
    if not domain_value or domain_value == "unknown":
         log_warn("Domain inference inconclusive; continuing in generic mode.")
         try:
             schema_map.domain_guess.domain = "generic"
             schema_map.domain_guess.confidence = 0.0
         except AttributeError:
             pass
         state.write("domain_guard_warning", {"message": "Domain guard relaxed due to low confidence."})

    # Save schema_map (handled by interpreter, but ensuring active copy)
    state.write("schema_map", schema_map)
    log_ok("Schema map locked.")

    # Step 3: Run the rest of ACE with dynamic features
    log_launch("Launching Overseer with dynamic schema...")
    overseer = Overseer(schema_map=schema_map, state=state)
    overseer_result = overseer.run() 
    
    # Step 4: Run Sentry (Universal Anomaly Detection)
    from agents.sentry import Sentry
    log_launch("Launching Sentry V3...")
    sentry = Sentry(schema_map=schema_map, state=state)
    sentry.run()
    
    # Step 5: Run Persona Engine (Universal Personas)
    from agents.persona_engine import PersonaEngine
    log_launch("Launching Persona Engine V3...")
    persona_engine = PersonaEngine(schema_map=schema_map, state=state)
    persona_engine.run()
    
    # Step 6: Run Fabricator (Universal Strategies)
    from agents.fabricator import Fabricator
    log_launch("Launching Fabricator V3...")
    fabricator = Fabricator(schema_map=schema_map, state=state)
    fabricator.run()
    
    # Step 7: Run Expositor (Final Report)
    from agents.expositor import Expositor
    log_launch("Launching Expositor V3...")
    expositor = Expositor(schema_map=schema_map, state=state)
    expositor.run()
    
    # Load the output to return it
    overseer_output = state.read("overseer_output")
            
    # Load persona output
    personas = state.read("personas")
    if overseer_output and personas:
        overseer_output["personas"] = personas

    # Load strategy output
    strategies = state.read("strategies")
    if overseer_output and strategies:
        overseer_output["strategies"] = strategies
        
    # Load final report
    final_report_path = state.get_file_path("final_report.md")
    if Path(final_report_path).exists():
        if overseer_output:
            with open(final_report_path, "r", encoding="utf-8") as f:
                overseer_output["final_report"] = f.read()
    
    # Add sanitizer report to output
    if overseer_output:
        if "intake_result" in locals():
             overseer_output["intake_logs"] = intake_result.get("logs", [])
        # overseer_output["sanitizer_report"] = clean_report # Deprecated in V4

    print("=== ACE V3 COMPLETE ===")
    return run_id, run_path

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run ACE V3 Universal Engine")
    parser.add_argument("dataset", nargs="?", default="data/customer_data.csv", help="Path to dataset CSV")
    args = parser.parse_args()
    
    run_ace_v3(args.dataset)

