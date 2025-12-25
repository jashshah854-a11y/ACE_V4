from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass
class ExplanationTemplate:
    code: str              # unique id, example "outlier_iqr_global"
    anomaly_type: str      # example "outlier"
    detector: str          # example "outlier_iqr"
    text_template: str     # uses format keys
    fix_template: Optional[str] = None      # optional, uses format keys too

    def render(self, ctx: Dict[str, Any]) -> Dict[str, str]:
        """
        ctx contains values like column, value, lower_bound, upper_bound etc.
        Returns dict with explanation and suggested_fix.
        """
        explanation = self.text_template.format(**ctx)
        fix = self.fix_template.format(**ctx) if self.fix_template else ""
        return {
            "explanation": explanation,
            "suggested_fix": fix,
        }


TEMPLATES = [
    ExplanationTemplate(
        code="outlier_iqr_global",
        anomaly_type="outlier",
        detector="outlier_iqr",
        text_template=(
            "Value {value} in column {column} is outside the expected range "
            "{lower_bound} to {upper_bound} based on IQR outlier rule."
        ),
        fix_template=(
            "Check this record for data entry issues or treat it as a special case. "
            "If valid, consider capping analysis at percentile {cap_percent}."
        ),
    ),
    ExplanationTemplate(
        code="referential_orphan",
        anomaly_type="referential_integrity",
        detector="referential_checker",
        text_template=(
            "Child table {child_table} contains keys in column {child_key} "
            "that have no matching parent in table {parent_table} on key {parent_key}. "
            "Orphan rate is {orphan_rate:.3f}."
        ),
        fix_template=(
            "Ensure all child records reference existing parent rows. "
            "Fix or remove orphan keys like {sample_key_example} at the source."
        ),
    ),
    ExplanationTemplate(
        code="value_conflict_domain",
        anomaly_type="value_conflict",
        detector="value_domain_checker",
        text_template=(
            "Column {column} uses different categorical values in tables "
            "{table_one} and {table_two}. This can break joins and reports."
        ),
        fix_template=(
            "Align code sets across sources. For example map {example_value_one} "
            "to {example_value_two} or pick one standard and clean the data."
        ),
    ),
    ExplanationTemplate(
        code="context_refund_downgrade",
        anomaly_type="outlier",
        detector="outlier_iqr",
        text_template=(
            "Negative transaction amount in column {column} was flagged as an outlier "
            "but context indicates a refund transaction."
        ),
        fix_template=(
            "No structural change needed. Confirm refund logic is correct and keep "
            "these rows for refund analytics."
        ),
    ),
]

INDEX = {(t.anomaly_type, t.detector, t.code): t for t in TEMPLATES}


def get_template(anomaly_type: str, detector: str, code: str) -> Optional[ExplanationTemplate]:
    return INDEX.get((anomaly_type, detector, code))
