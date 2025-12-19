from .loader import IntakeLoader
from .classifier import IntakeClassifier
from .relationships import IntakeRelationships
from .fusion import IntakeFusion
from typing import Dict, Any

class IntakeSystem:
    def __init__(self, run_path: str):
        self.run_path = run_path
        self.loader = IntakeLoader(run_path)
        self.classifier = IntakeClassifier()
        self.relationships = IntakeRelationships()
        self.fusion = IntakeFusion(run_path)

    def load_input(self, input_path: str) -> Dict[str, Any]:
        """
        Main entry point for ACE V4 Intake.
        """
        print(f"[INTAKE] Starting Intake for: {input_path}")
        
        # 1. Load Tables
        tables = self.loader.load_input(input_path)
        if not tables:
            print("[INTAKE][ERROR] No tables found.")
            return {"error": "No tables found"}
            
        # 1.5 Normalize Dates
        from .utils import normalize_dates
        import pandas as pd
        for t in tables:
            df = pd.read_csv(t["path"])
            df = normalize_dates(df)
            df.to_csv(t["path"], index=False)
            
        print(f"[INTAKE] Loaded {len(tables)} tables: {[t['name'] for t in tables]}")

        # 2. Classify Tables
        tables = self.classifier.classify(tables)
        for t in tables:
            print(f"   - {t['name']}: {t['type']} ({t['grain']})")

        # 3. Detect Relationships
        rels = self.relationships.detect(tables)
        print(f"[INTAKE] Detected {len(rels)} relationships:")
        for r in rels:
            print(f"   - {r['parent']} -> {r['child']} (on {r.get('parent_key', r.get('key'))})")

        # 4. Fuse Data
        fusion_result = self.fusion.fuse(tables, rels)
        
        # 5. Cleanup
        self.loader.cleanup()
        
        result = {
            "tables": {t["name"]: t for t in tables},
            "relationships": rels,
            "primary_table": fusion_result.get("primary_table"),
            "master_dataset_path": fusion_result.get("master_dataset_path"),
            "validation": fusion_result.get("validation"),
            "fusion_status": fusion_result.get("fusion_status"),
            "growth_ratio": fusion_result.get("growth_ratio"),
            "fusion_report_path": fusion_result.get("fusion_report_path"),
            "logs": [] # Todo: collect logs
        }
        
        return result
