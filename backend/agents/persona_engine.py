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
You are the ACE V3 Persona Engine.
Your goal is to generate data-driven personas based on cluster fingerprints and schema context.

Your responsibilities:
1. Analyze the provided cluster fingerprints (which contain role summaries and feature means).
2. Create a distinct, realistic persona for each cluster.
3. Assign a domain-specific name (e.g., "Budget Conscious" for finance, "Window Shopper" for retail).
4. Infer motivation and behavior from the data.

OUTPUT FORMAT:
Return a JSON array of persona objects. Each object must have:
- cluster_id: matching the input cluster ID
- name: creative name
- label: short descriptive label
- snapshot: { income_level, spend_level, risk_score } (High/Medium/Low)
- behavior: description of habits
- motivation: key driver
- opportunity_zone: best area for engagement
- emotional_state: current sentiment
- action: recommended action
- persona_size: number of customers
- reasoning: why this persona fits the data
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


    def _fallback_personas_from_clusters(self, fingerprints: dict) -> list:
        """
        Generate structured personas using role summaries when the LLM fails.
        """
        personas = []
        if not fingerprints:
            return personas

        role_aliases = {
            "income_like": ("income_like", "income"),
            "spend_like": ("spend_like", "spend"),
            "risk_like": ("risk_like", "risk"),
        }

        def resolve_role_value(role_sums, role_key):
            for alias in role_aliases.get(role_key, (role_key,)):
                val = self._coerce_float(role_sums.get(alias))
                if val is not None:
                    return val
            return None

        sample_roles = {role: [] for role in ("income_like", "spend_like", "risk_like")}
        for fp in fingerprints.values():
            role_sums = fp.get("role_summaries", {}) or {}
            for role in sample_roles:
                val = resolve_role_value(role_sums, role)
                if val is not None:
                    sample_roles[role].append(val)

        for cid, fp in fingerprints.items():
            role_sums = fp.get("role_summaries", {}) or {}
            size = int(fp.get("size") or fp.get("cluster_size") or 0)
            income_val = resolve_role_value(role_sums, "income_like")
            spend_val = resolve_role_value(role_sums, "spend_like")
            risk_val = resolve_role_value(role_sums, "risk_like")

            income_bucket = self._bucketize(income_val, sample_roles["income_like"])
            spend_bucket = self._bucketize(spend_val, sample_roles["spend_like"])
            risk_bucket = self._bucketize(risk_val, sample_roles["risk_like"])

            label = self._derive_label(income_bucket, spend_bucket, risk_bucket)
            snapshot = {
                "income_level": income_bucket,
                "spend_level": spend_bucket,
                "risk_score": risk_bucket
            }

            summary = f"{size or 'Unknown'} customers with {income_bucket} income, {spend_bucket} spend, {risk_bucket} risk."
            if risk_bucket == "High":
                behavior = "Volatile usage patterns with frequent spikes."
                motivation = "Stability and reassurance."
                opportunity = "Risk Mitigation"
                action = "Deploy retention outreach with guidance and support."
                emotion = "Anxious"
            elif income_bucket == "High":
                behavior = "Consistent engagement with strong value absorption."
                motivation = "Premium experiences."
                opportunity = "Growth"
                action = "Offer tailored upsell bundles and loyalty rewards."
                emotion = "Confident"
            else:
                behavior = "Moderate activity focused on essentials."
                motivation = "Reliability and savings."
                opportunity = "Retention"
                action = "Provide education, quick wins, and reassurance."
                emotion = "Neutral"

            personas.append({
                "cluster_id": cid,
                "name": f"{label} Cluster {cid}",
                "label": label,
                "snapshot": snapshot,
                "behavior": behavior,
                "motivation": motivation,
                "opportunity_zone": opportunity,
                "emotional_state": emotion,
                "action": action,
                "persona_size": size,
                "avg_risk": risk_val if risk_val is not None else 0.0,
                "reasoning": "Generated from schema role summaries due to LLM fallback.",
                "summary": summary
            })

        return personas

    def run(self):
        log_launch(f"Triggering ACE {self.name}...")
        
        # 1. Read Rich State (Overseer Output)
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
            log_warn("No fingerprints found. Writing empty persona artifact.")
            empty_payload = {"personas": []}
            if self.state:
                self.state.write("personas", empty_payload)
            else:
                Path("data").mkdir(exist_ok=True)
                Path("data/personas_output.json").write_text(json.dumps(empty_payload, indent=2))
            return empty_payload["personas"]

        # 2. Construct Prompt
        # We need to serialize the schema map and fingerprints for the LLM
        domain_guess = getattr(getattr(self.schema_map, "domain_guess", None), "domain", "generic") or "generic"
        roles = self.schema_map.semantic_roles.model_dump() if hasattr(self.schema_map.semantic_roles, "model_dump") else {}
        context = {
            "domain": domain_guess,
            "roles": roles,
            "fingerprints": fingerprints
        }
        
        prompt = f"{SYSTEM_PROMPT}\n\nINPUT CONTEXT:\n{json.dumps(context, indent=2)}"
        
        # 3. Call LLM
        log_info("Generating Personas (LLM)...")
        response = ask_gemini(prompt)
        
        # 4. Parse & Save
        try:
            personas = extract_json_block(response)
            # Ensure it's a list
            if isinstance(personas, dict) and "personas" in personas:
                personas = personas["personas"]
        except JsonExtractionError as e:
            log_error(f"JSON Parsing failed: {e}. Using fallback.")
            personas = self._fallback_personas_from_clusters(fingerprints)
            
        try:
            # Save to disk
            if self.state:
                self.state.write("personas", {"personas": personas})
            else:
                with open("data/personas_output.json", "w") as f:
                    json.dump(personas, f, indent=2)
                
            # Update State
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
            return None

    def fallback(self, error):
        log_error(f"Persona Engine fallback triggered: {error}")
        # Try to generate from clusters if possible
        try:
            overseer_output = self.state.read("overseer_output") or {}
            fingerprints = overseer_output.get("fingerprints", {})
            personas = self._fallback_personas_from_clusters(fingerprints)
        except:
            personas = []
            
        return {"personas": personas, "error": str(error)}

def main():
    if len(sys.argv) < 2:
        print("Usage: python persona_engine.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    # Load Schema
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = PersonaEngine(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        fallback_output = agent.fallback(e)
        state.write("personas", fallback_output)

if __name__ == "__main__":
    main()



