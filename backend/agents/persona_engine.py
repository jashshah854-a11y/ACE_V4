import json
import sys
from pathlib import Path
from utils.logging import log_launch, log_warn, log_info, log_ok, log_error

from core.env import ensure_windows_cpu_env

ensure_windows_cpu_env()

# Add project root to path
try:
    import requests
except ImportError:
    requests = None

sys.path.append(str(Path(__file__).parent.parent))

from core.llm import ask_gemini
from core.schema import SchemaMap, ensure_schema_map
from core.state_manager import StateManager
from core.json_utils import extract_json_block, JsonExtractionError

SYSTEM_PROMPT = """
You are the ACE V4 Persona Engine.
Your goal is to generate data-driven personas grounded in cluster fingerprints, predictive model results, and feature attributions.

Your responsibilities:
1. Analyze the provided cluster fingerprints (role summaries and feature means per cluster).
2. If SHAP feature attributions are provided, use them to ground persona traits in what actually drives the model's predictions rather than assumptions.
3. If regression context is provided (target column, top drivers, model quality), incorporate this into persona motivations and opportunity zones.
4. Create a distinct, realistic persona for each cluster.
5. Assign a domain-specific name (e.g., "Budget Conscious" for finance, "At-Risk Veteran" for churn).
6. Infer motivation and behavior from the data, not speculation.

IMPORTANT:
- Ground all traits in the data. Reference specific features and their values.
- If SHAP data shows a feature strongly drives the outcome, reflect this in the persona's behavior and opportunity_zone.
- If model quality is poor (negative R² or low accuracy), note that predictions are exploratory.

OUTPUT FORMAT:
Return a JSON array of persona objects. Each object must have:
- cluster_id: matching the input cluster ID
- name: creative, domain-specific name
- label: short descriptive label (3-5 words)
- snapshot: { income_level, spend_level, risk_score } (High/Medium/Low)
- behavior: description of habits grounded in data
- motivation: key driver (reference actual features)
- opportunity_zone: best area for engagement (actionable)
- emotional_state: current sentiment
- action: recommended action (specific and measurable)
- persona_size: number of customers in this cluster
- reasoning: why this persona fits the data (cite features/values)
- summary: one sentence summary

Do not include markdown formatting.
"""

class PersonaEngine:
    def __init__(self, schema_map: SchemaMap, state: StateManager = None):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state
        self.name = "Persona Engine"

    def _coerce_float(self, value):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _bucketize(self, value, samples):
        if value is None or not samples:
            return "Unknown"
        sorted_vals = sorted(samples)
        low_idx = max(0, int(len(sorted_vals) * 0.33) - 1)
        high_idx = min(len(sorted_vals) - 1, int(len(sorted_vals) * 0.66))
        low = sorted_vals[low_idx]
        high = sorted_vals[high_idx]
        if value <= low:
            return "Low"
        if value >= high:
            return "High"
        return "Medium"

    def _derive_label(self, income_bucket, spend_bucket, risk_bucket):
        if risk_bucket == "High":
            return "At-Risk Segment"
        if income_bucket == "High" and spend_bucket in ("Medium", "High"):
            return "Growth Driver"
        if income_bucket == "High":
            return "High Income"
        if income_bucket == "Low":
            return "Budget Conscious"
        return "Baseline Segment"


    def run(self):
        log_launch(f"Triggering ACE {self.name}...")
        
        overseer_output = {}
        if self.state:
            overseer_output = self.state.read("overseer_output") or {}
        
        if not overseer_output:
            if requests:
                try:
                    response = requests.get("http://localhost:8000/read/overseer_output").json()
                    overseer_output = response.get("value", {})
                except Exception:
                    log_warn("Overseer output not found, trying legacy clusters...")
                    overseer_output = {}
            else:
                log_warn("Requests not installed; skipping remote overseer fetch.")
                overseer_output = {}
            
        fingerprints = overseer_output.get("fingerprints", {})
        
        if not fingerprints:
            log_warn("No fingerprints available for persona generation; skipping personas.")
            return None

        domain_guess = getattr(getattr(self.schema_map, "domain_guess", None), "domain", "generic") or "generic"
        roles = self.schema_map.semantic_roles.model_dump() if hasattr(self.schema_map.semantic_roles, "model_dump") else {}
        context = {
            "domain": domain_guess,
            "roles": roles,
            "fingerprints": fingerprints
        }

        # Enrich context with regression and SHAP data if available
        if self.state:
            regression = self.state.read("regression_insights") or {}
            if regression.get("status") == "success":
                context["regression"] = {
                    "target_column": regression.get("target_column"),
                    "target_type": regression.get("target_type"),
                    "model_quality": regression.get("narrative", ""),
                    "top_drivers": [
                        {"feature": d.get("feature"), "importance": d.get("importance")}
                        for d in regression.get("drivers", [])[:5]
                    ],
                }

            shap_data = self.state.read("shap_explanations") or {}
            if shap_data.get("available"):
                context["shap_attribution"] = {
                    "top_features": shap_data.get("importance_ranking", [])[:5],
                    "narrative": shap_data.get("narrative", ""),
                }

        prompt = f"{SYSTEM_PROMPT}\n\nINPUT CONTEXT:\n{json.dumps(context, indent=2)}"
        
        log_info("Generating Personas (LLM)...")
        response = ask_gemini(prompt)
        
        try:
            personas = extract_json_block(response)
            if isinstance(personas, dict) and "personas" in personas:
                personas = personas["personas"]
        except JsonExtractionError as e:
            log_error(f"JSON Parsing failed: {e}.")
            raise
            
        try:
            if self.state:
                self.state.write("personas", {"personas": personas})
            else:
                with open("data/personas_output.json", "w") as f:
                    json.dump(personas, f, indent=2)
                
            if requests:
                try:
                    requests.post("http://localhost:8000/update", json={
                        "key": "personas",
                        "value": {"personas": personas}
                    })
                except Exception:
                    pass
            else:
                log_warn("Requests not installed; skipping persona state callback.")
                
            log_ok("Persona Engine V3 Complete. Output saved.")
            return personas
            
        except Exception as e:
            log_error(f"Failed to save personas: {e}")
            raise


def main():
    if len(sys.argv) < 2:
        print("Usage: python persona_engine.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = PersonaEngine(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        log_error(f"Persona Engine failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

