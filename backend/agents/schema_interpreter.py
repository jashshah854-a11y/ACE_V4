import json
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

from core.schema_storage import save_schema_map
from core.schema import SchemaMap  # your Pydantic model
from core.llm import call_llm_json  # from llm.py, as defined above


class SchemaInterpreter:
    """
    ACE V3.6 Schema Interpreter

    Uses scanner output for:
      basic_types, stats, relationships and other heavy structure.

    Uses Gemini only for:
      domain_guess
      semantic_roles
      role_confidence
      feature_plan
      warnings

    This keeps the LLM JSON response small and stable.
    """

    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name

    def _build_column_summaries(self, scan: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Build a slim summary of columns for the LLM.
        Uses only what is needed for semantic role detection.
        """
        cols = []
        basic_types = scan.get("basic_types", {})
        stats = scan.get("stats", {})
        sample_rows = scan.get("dataset_info", {}).get("sample_rows", [])

        # pick up to 3 sample rows
        sample_rows_small = sample_rows[:3] if isinstance(sample_rows, list) else []

        column_types = {}
        for type_name, col_names in basic_types.items():
            if isinstance(col_names, list):
                for col_name in col_names:
                    column_types[col_name] = type_name

        for col_name in stats.keys():
            column_types.setdefault(col_name, "numeric")

        for col_name, col_type in column_types.items():
            col_stats = stats.get(col_name, {})
            example_values = []

            for row in sample_rows_small:
                if isinstance(row, dict) and col_name in row:
                    example_values.append(row[col_name])

            cols.append(
                {
                    "name": col_name,
                    "basic_type": col_type,
                    "example_values": example_values,
                    "missing_ratio": col_stats.get("missing_rate"),
                }
            )

        return cols

    def _build_system_prompt(self) -> str:
        return (
            "You are ACE V3 Schema Brain.\n"
            "Your job is to look at columns and decide which represent income like, "
            "spend like, risk like, time like, id like, and general numeric features.\n"
            "You must output a SMALL JSON object only with domain_guess, semantic_roles, "
            "role_confidence, feature_plan, and warnings.\n"
            "Do not include sample rows, stats, correlations, or any other large content.\n"
            "Your JSON must be valid and parseable by json.loads. No comments, no trailing commas."
        )

    def _build_user_prompt(self, scan: Dict[str, Any]) -> str:
        dataset_name = scan.get("dataset_info", {}).get("name", "unknown_dataset")
        col_summaries = self._build_column_summaries(scan)

        payload = {
            "dataset_name": dataset_name,
            "columns": col_summaries,
        }

        return (
            "Here is a summary of the dataset columns.\n"
            "Think about what this dataset likely represents and assign semantic roles.\n"
            "Return JSON with the following shape only:\n\n"
            "{\n"
            '  "domain_guess": "finance or ecommerce or marketing analytics or generic",\n'
            '  "semantic_roles": {\n'
            '    "income_like": ["col_name_1", "..."],\n'
            '    "spend_like": ["..."],\n'
            '    "risk_like": ["..."],\n'
            '    "time_like": ["..."],\n'
            '    "id_like": ["..."],\n'
            '    "other_numeric": ["..."]\n'
            "  },\n"
            '  "role_confidence": {\n'
            '    "income_like": 0.0,\n'
            '    "spend_like": 0.0,\n'
            '    "risk_like": 0.0\n'
            "  },\n"
            '  "feature_plan": {\n'
            '    "use_for_clustering": ["..."],\n'
            '    "use_for_risk": ["..."],\n'
            '    "use_for_behavior": ["..."]\n'
            "  },\n"
            '  "warnings": ["any short notes"]\n'
            "}\n\n"
            "Here is the column summary payload:\n"
            f"{json.dumps(payload, indent=2)}"
        )

    def _normalize_feature_plan(self, llm_plan: Dict[str, Any], scan: Dict[str, Any]) -> Dict[str, List[str]]:
        plan = llm_plan or {}
        numeric = scan.get("basic_types", {}).get("numeric", []) or []

        def pick(*keys, fallback=None):
            for key in keys:
                value = plan.get(key) if isinstance(plan, dict) else None
                if value:
                    return value
            return fallback or []

        return {
            "clustering_features": pick("clustering_features", "use_for_clustering", fallback=numeric),
            "persona_features": pick("persona_features", "use_for_behavior", fallback=numeric),
            "risk_features": pick("risk_features", "use_for_risk"),
            "value_features": pick("value_features", "use_for_value"),
            "anomaly_features": pick("anomaly_features", fallback=numeric),
        }

    def run(self, scan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point. Takes scanner output and returns a SchemaMap dict.
        Also writes data/schema_map.json and data/schemas/<name>_schema.json.
        """
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(scan)

        print(f"[INFO] Interpreting Schema (LLM: {self.model_name})...")
        try:
            llm_response = call_llm_json(system_prompt, user_prompt, model_name=self.model_name)
        except Exception as e:
            print(f"[ERROR] Schema interpretation LLM call failed: {e}")
            # fallback: simple generic schema
            llm_response = {
                "domain_guess": "generic",
                "semantic_roles": {
                    "income_like": [],
                    "spend_like": [],
                    "risk_like": [],
                    "time_like": [],
                    "id_like": [],
                    "other_numeric": scan.get("basic_types", {}).get("numeric", []),
                },
                "role_confidence": {},
                "feature_plan": {
                    "use_for_clustering": scan.get("basic_types", {}).get("numeric", []),
                    "use_for_risk": [],
                    "use_for_behavior": [],
                },
                "warnings": ["LLM schema interpretation failed, using fallback"],
            }

        # Fix domain_guess structure if it's just a string
        domain_val = llm_response.get("domain_guess", "generic")
        if isinstance(domain_val, str):
            domain_obj = {"domain": domain_val, "confidence": 0.8}
        else:
            domain_obj = domain_val

        # merge scanner structure with LLM annotations into SchemaMap
        schema_map_payload: Dict[str, Any] = {
            "dataset_info": scan.get("dataset_info", {}),
            "basic_types": scan.get("basic_types", {}),
            "stats": scan.get("stats", {}),
            "semantic_roles": llm_response.get("semantic_roles", {}),
            "role_confidence": llm_response.get("role_confidence", {}),
            "domain_guess": domain_obj,
            "feature_quality_scores": scan.get("feature_quality_scores", {}),
            "relationships": scan.get("relationships", {}),
            # keep normalization_plan from scanner if present
            "normalization_plan": scan.get("normalization_plan", {}),
            "feature_plan": self._normalize_feature_plan(llm_response.get("feature_plan", {}), scan),
            "warnings": {
                "missing_numeric": False,
                "low_row_count": False,
                "suspected_data_issues": llm_response.get("warnings", [])
            }
        }

        # validate with SchemaMap model if you use Pydantic
        try:
            schema_map = SchemaMap(**schema_map_payload)
            schema_map_dict = schema_map.model_dump()
            # save schema map in usual locations
            save_schema_map(schema_map)
        except Exception as e:
             print(f"[WARN] Pydantic validation failed, using raw dict: {e}")
             schema_map_dict = schema_map_payload
             # If validation fails, we can't use save_schema_map if it expects a model
             # We'll try to save the dict directly to the file manually as fallback
             try:
                 with open("data/schema_map.json", "w") as f:
                     json.dump(schema_map_dict, f, indent=2)
             except Exception as save_err:
                 print(f"[ERROR] Failed to save fallback schema map: {save_err}")

        # also save a schema snapshot
        schemas_dir = Path("data") / "schemas"
        schemas_dir.mkdir(parents=True, exist_ok=True)
        name = schema_map_payload.get("dataset_info", {}).get("name", "dataset")
        snapshot_path = schemas_dir / f"{name}_schema.json"
        with snapshot_path.open("w", encoding="utf8") as f:
            json.dump(schema_map_dict, f, indent=2)

        print("[OK] Schema Map generated and saved.")
        return schema_map_dict


if __name__ == "__main__":
    # allows manual testing
    scan_path = Path("data") / "schema_scan_output.json"
    if scan_path.exists():
        with scan_path.open("r", encoding="utf8") as f:
            scan = json.load(f)
        interpreter = SchemaInterpreter()
        schema = interpreter.run(scan)
        # print(json.dumps(schema, indent=2)[:2000])
    else:
        print("[ERROR] data/schema_scan_output.json not found")
