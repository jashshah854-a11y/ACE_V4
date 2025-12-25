from typing import Dict, Any, Optional, List
import pandas as pd
import uuid
from .models import AnomalyResult, AnomalyRecord, MasterDataset
from .types import TypeInferer
from .format_normalizer import FormatNormalizer
from .missing_handler import MissingHandler
from .duplicates_integrity import DuplicatesIntegrityChecker
from .outliers import OutlierDetector
from ace_v4.explainability.engine import ExplainabilityEngine

class AnomalyEngine:
    def __init__(self, master_dataset: Optional[MasterDataset] = None):
        self.master_dataset = master_dataset
        self.type_inferer = TypeInferer()
        self.format_normalizer = FormatNormalizer()
        self.missing_handler = MissingHandler()
        self.integrity_checker = DuplicatesIntegrityChecker()
        self.outlier_detector = OutlierDetector()
        self.explainer = ExplainabilityEngine()

    def _to_dataframe(self, anomalies: List[AnomalyRecord]) -> pd.DataFrame:
        return pd.DataFrame([vars(a) for a in anomalies])

    def run(self, master_dataset: Optional[MasterDataset] = None) -> AnomalyResult:
        print("=== Starting Anomaly Engine ===")
        
        # Use instance master_dataset if not provided
        master_dataset = master_dataset or self.master_dataset
        if not master_dataset:
            raise ValueError("No master dataset provided")

        # Load Data
        path = master_dataset.master_dataset_path
        if not path:
            # Fallback: try to get primary table from tables dict
            if master_dataset.primary_table in master_dataset.tables:
                df = master_dataset.tables[master_dataset.primary_table]
            else:
                raise ValueError("No master dataset path or primary table provided")
        else:
            df = pd.read_csv(path)
            
        table_name = master_dataset.primary_table
        logs = []
        all_anomalies = []
        
        # 1. Type Inference
        print("Running Type Inference...")
        df, metadata = self.type_inferer.infer_and_update(df)
        logs.append("Type inference complete")
        
        # 2. Format Normalization
        print("Running Format Normalization...")
        df = self.format_normalizer.normalize(df, metadata)
        logs.append("Format normalization complete")
        
        # 3. Missing Handling
        print("Running Missing Handler...")
        df = self.missing_handler.normalize(df)
        missing_anomalies = self.missing_handler.detect_anomalies(df, table_name)
        all_anomalies.extend(missing_anomalies)
        logs.append(f"Found {len(missing_anomalies)} missing value anomalies")
        
        # 4. Integrity Checks
        print("Running Integrity Checks...")
        # Try to guess key column if not provided
        key_col = next((c for c in df.columns if "id" in c.lower()), None)
        integrity_anomalies = self.integrity_checker.run(df, table_name, key_col)
        all_anomalies.extend(integrity_anomalies)
        logs.append(f"Found {len(integrity_anomalies)} integrity anomalies")
        
        # 5. Outlier Detection
        print("Running Outlier Detection...")
        outlier_anomalies = self.outlier_detector.run(df, table_name)
        all_anomalies.extend(outlier_anomalies)
        logs.append(f"Found {len(outlier_anomalies)} outliers")
        
        # 5.5 Integration Layer (Cross-Table Checks)
        if master_dataset.tables and master_dataset.relationships:
            print("Running Integration Layer...")
            from ace_v4.integration.engine import IntegrationEngine
            
            # Initialize with schema graph (relationships)
            integration_engine = IntegrationEngine(
                schema_graph=master_dataset.relationships
            )
            
            # Run checks
            integration_issues = integration_engine.run(master_dataset)
            
            # Convert IntegrationIssue to AnomalyRecord
            for issue in integration_issues:
                # Map issue type to detector/rule
                detector = "unknown"
                rule_name = ""
                
                if issue.issue_type == "referential_integrity":
                    detector = "referential_checker"
                    rule_name = "referential_orphan"
                elif issue.issue_type == "value_conflict":
                    detector = "value_domain_checker"
                    rule_name = "value_conflict_domain"
                
                all_anomalies.append(AnomalyRecord(
                    id=str(uuid.uuid4()),
                    table_name=issue.tables_involved[1] if len(issue.tables_involved) > 1 else issue.tables_involved[0],
                    column_name=issue.key_column,
                    row_index=None, # Integration issues are often table-level or set-level
                    anomaly_type=issue.issue_type,
                    severity=issue.severity,
                    description=issue.description,
                    suggested_fix="Check source data integrity",
                    context=issue.context,
                    detector=detector,
                    rule_name=rule_name
                ))
            logs.append(f"Found {len(integration_issues)} integration issues")
        
        # 6. Context Intelligence Layer (Business Rules)
        print("Running Context Intelligence Layer...")
        from ace_v4.context.engine import ContextEngine
        context_engine = ContextEngine()
        
        # Apply rules to filter/modify anomalies
        all_anomalies = context_engine.apply_rules(df, all_anomalies)
        logs.append(f"Applied context rules. Final anomaly count: {len(all_anomalies)}")
        
        # 7. Explainability Layer
        print("Running Explainability Engine...")
        explained_anomalies = self.explainer.explain_all(all_anomalies)
        
        print("=== Anomaly Engine Complete ===")
        
        return AnomalyResult(
            cleaned_df=df,
            anomalies_df=self._to_dataframe(explained_anomalies),
            column_metadata=metadata,
            logs=logs,
            anomalies=explained_anomalies
        )
