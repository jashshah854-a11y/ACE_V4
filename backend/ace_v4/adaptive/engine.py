from typing import List
import pandas as pd

from ace_v4.anomaly_engine.models import AnomalyRecord
from .selector import ModelSelector


class AdaptiveEngine:
    def __init__(self):
        self.selector = ModelSelector()

    def run_on_column(self, df: pd.DataFrame, table_name: str, column: str):
        series = df[column]
        model = self.selector.choose(series)
        model.fit(series)

        anomalies = []

        for idx, val in enumerate(series):
            try:
                valf = float(val)
            except:
                continue

            # StatsModel case  
            if hasattr(model, "score"):
                status = model.score(valf)
                if status == "hard" or status == "soft":
                    anomalies.append(AnomalyRecord(
                        id=f"{table_name}_{column}_{idx}",
                        table_name=table_name,
                        column_name=column,
                        row_index=idx,
                        anomaly_type="outlier",
                        severity="high" if status == "hard" else "medium",
                        description=f"Adaptive outlier detected in {column}",
                        suggested_fix="",
                        detector="adaptive_stats",
                        rule_name="adaptive_stats_default",
                        context={
                            "value": valf,
                            "confidence_score": 0.95 if status == "hard" else 0.65,
                            "confidence_reasoning": "Statistical hard outlier (>3 std dev)." if status == "hard" else "Statistical soft outlier (>2 std dev)."
                        }
                    ))

            # ML case  
            elif hasattr(model, "is_anomaly"):
                if model.is_anomaly(valf):
                    anomalies.append(AnomalyRecord(
                        id=f"{table_name}_{column}_{idx}",
                        table_name=table_name,
                        column_name=column,
                        row_index=idx,
                        anomaly_type="outlier",
                        severity="medium",
                        description=f"ML detected anomaly in {column}",
                        suggested_fix="",
                        detector="adaptive_ml",
                        rule_name="adaptive_ml_default",
                        context={
                            "value": valf,
                            "confidence_score": 0.88,  # ML models assumed higher confidence
                            "confidence_reasoning": "Detected by isolation forest with clear separation."
                        }
                    ))

        return anomalies

    def run_on_table(self, table_name: str, df: pd.DataFrame) -> List[AnomalyRecord]:
        all_anoms = []
        for col in df.columns:
            if not pd.api.types.is_numeric_dtype(df[col]):
                continue
            all_anoms.extend(self.run_on_column(df, table_name, col))
        return all_anoms
