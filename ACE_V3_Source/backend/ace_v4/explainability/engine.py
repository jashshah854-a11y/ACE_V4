from typing import List, Dict, Any

from ace_v4.anomaly_engine.models import AnomalyRecord
from .templates import get_template


class ExplainabilityEngine:
    def __init__(self, default_cap_percent: int = 99):
        self.default_cap_percent = default_cap_percent

    def build_context_for_anomaly(
        self,
        anomaly: AnomalyRecord,
        extra_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Merge anomaly context with engine defaults to prepare
        template variables.
        """
        ctx = dict(extra_context or {})
        ctx.update(anomaly.context or {})

        # common fields
        ctx.setdefault("column", anomaly.column_name)
        ctx.setdefault("value", anomaly.context.get("value"))
        ctx.setdefault("cap_percent", self.default_cap_percent)

        return ctx

    def explain_one(
        self,
        anomaly: AnomalyRecord,
        extra_context: Dict[str, Any] = None
    ) -> AnomalyRecord:
        anomaly_type = anomaly.anomaly_type
        detector = anomaly.detector or "unknown"
        code = anomaly.rule_name or ""

        template = get_template(anomaly_type, detector, code)

        if not template:
            # fallback explanation
            if not anomaly.explanation:
                anomaly.explanation = (
                    f"Record in table {anomaly.table_name}, column {anomaly.column_name} "
                    f"was flagged as {anomaly.anomaly_type} by {detector}."
                )
            if not anomaly.suggested_fix:
                anomaly.suggested_fix = "Review this record and confirm if it reflects a real business case."
            return anomaly

        ctx = self.build_context_for_anomaly(anomaly, extra_context)
        try:
            rendered = template.render(ctx)
            anomaly.explanation = rendered["explanation"]
            if not anomaly.suggested_fix:
                anomaly.suggested_fix = rendered["suggested_fix"]
        except KeyError as e:
            # Fallback if context is missing keys
            anomaly.explanation = f"Flagged as {anomaly_type} by {detector}. (Missing context: {e})"
            if not anomaly.suggested_fix:
                anomaly.suggested_fix = "Check data integrity."

        return anomaly

    def explain_all(
        self,
        anomalies: List[AnomalyRecord],
        extra_context: Dict[str, Any] = None
    ) -> List[AnomalyRecord]:
        return [self.explain_one(a, extra_context) for a in anomalies]
