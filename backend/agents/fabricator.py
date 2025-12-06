import sys
import json
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.logging import log_launch, log_ok, log_warn
from core.state_manager import StateManager
from core.schema import SchemaMap, ensure_schema_map

class Fabricator:
    def __init__(self, schema_map: SchemaMap, state: StateManager):
        self.schema_map = ensure_schema_map(schema_map)
        self.state = state
        self.name = "Fabricator"

    def _resolve_risk_score(self, persona):
        snapshot = persona.get("snapshot") if isinstance(persona, dict) else None
        if isinstance(snapshot, dict):
            risk_value = snapshot.get("risk_score")
            if isinstance(risk_value, (int, float)):
                return float(risk_value)
            if isinstance(risk_value, str):
                label = risk_value.lower()
                mapping = {"low": -0.5, "medium": 0.0, "high": 0.75}
                if label in mapping:
                    return mapping[label]
        avg_risk = persona.get("avg_risk") if isinstance(persona, dict) else None
        try:
            return float(avg_risk)
        except (TypeError, ValueError):
            pass
        deviations = persona.get("role_deviations", {}) if isinstance(persona, dict) else {}
        if isinstance(deviations, dict):
            try:
                return float(deviations.get("risk_like", 0.0))
            except (TypeError, ValueError):
                pass
        return 0.0


    def run(self):
        log_launch(f"Triggering ACE {self.name}...")
        
        personas_data = self.state.read("personas") or {}
        personas = personas_data.get("personas", [])
        
        if not personas:
            log_warn("No personas found. Strategies may be generic.")
            
        strategies = []

        for p in personas:
            risk_val = self._resolve_risk_score(p)

            if risk_val < -0.25:
                play_type = "growth"
            elif risk_val > 0.4:
                play_type = "risk_mitigation"
            else:
                play_type = "neutral"

            strategies.append({
                "persona_id": p.get("cluster_id") or p.get("id"),
                "persona_name": p.get("name"),
                "play_type": play_type,
                "headline": self._headline(play_type),
                "tactics": self._tactics(play_type)
            })

        output = {
            "status": "ok",
            "strategies": strategies
        }
        
        self.state.write("strategies", output)
        log_ok("Fabricator V3 Complete. Output saved.")
        return strategies

    def _headline(self, play_type):
        if play_type == "growth":
            return "Expand relationship with high value customers"
        if play_type == "risk_mitigation":
            return "Stabilize vulnerable or high risk segments"
        return "Nurture and understand emerging segments"

    def _tactics(self, play_type):
        if play_type == "growth":
            return [
                "Offer premium bundles or loyalty perks",
                "Upsell higher value products based on recent behavior"
            ]
        if play_type == "risk_mitigation":
            return [
                "Simplify offers and reduce friction",
                "Provide education, reminders, or supportive messaging"
            ]
        return [
            "Run test campaigns with low spend and multiple creatives",
            "Collect more data through surveys or feedback flows"
        ]

    def fallback(self, error):
        log_warn(f"Fabricator fallback triggered: {error}")
        return {
            "strategies": [],
            "meta": {"global_theme": "Fallback Strategy", "reason": str(error)}
        }

def main():
    if len(sys.argv) < 2:
        print("Usage: python fabricator.py <run_path>")
        sys.exit(1)

    run_path = sys.argv[1]
    state = StateManager(run_path)
    
    # Load Schema
    schema_data = state.read("schema_map")
    schema_map = ensure_schema_map(schema_data)

    agent = Fabricator(schema_map=schema_map, state=state)
    try:
        agent.run()
    except Exception as e:
        fallback_output = agent.fallback(e)
        state.write("strategies", fallback_output)

if __name__ == "__main__":
    main()
