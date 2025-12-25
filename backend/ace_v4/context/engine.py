from .rule_loader import RuleLoader
from .comparators import compare

class ContextEngine:
    def __init__(self, rules=None):
        loader = RuleLoader()
        self.rules = rules if rules else loader.load_rules()

    # Check if a rule applies to this row
    def match_rule(self, row, rule):
        w = rule["when"]

        col = w["column"]
        val = row.get(col, None)

        # Base condition
        if "operator" in w and "value" in w:
            if not compare(val, w["operator"], w["value"]):
                return False

        # equals shortcut
        if "equals" in w:
            if str(val).strip() != str(w["equals"]).strip():
                return False

        # starts_with shortcut
        if "starts_with" in w:
            if not compare(val, "starts_with", w["starts_with"]):
                return False
                
        # contains shortcut
        if "contains" in w:
            if not compare(val, "contains", w["contains"]):
                return False

        # AND conditions
        for cond in w.get("and", []):
            col2 = cond["column"]
            val2 = row.get(col2, None)

            # equals condition
            if "equals" in cond:
                if str(val2).strip() != str(cond["equals"]).strip():
                    return False

            # operator condition
            if "operator" in cond and "value" in cond:
                if not compare(val2, cond["operator"], cond["value"]):
                    return False

        return True

    # Apply a rule action to anomaly record
    def apply_rule(self, anomaly, rule):
        action = rule["action"]

        if action == "downgrade_severity":
            if anomaly.severity == "high":
                anomaly.severity = "medium"
            elif anomaly.severity == "medium":
                anomaly.severity = "low"

        elif action == "mark_valid_extreme":
            anomaly.context["valid_extreme"] = True

        elif action == "suppress":
            anomaly.context["suppressed"] = True

        return anomaly

    # Main entry: process all anomalies
    def apply_rules(self, dataset, anomalies):
        updated = []

        for anomaly in anomalies:
            # fetch actual row
            if anomaly.row_index is not None and anomaly.row_index < len(dataset):
                row = dataset.iloc[anomaly.row_index].to_dict()
            else:
                row = {}

            suppressed = False

            for rule in self.rules:
                if self.match_rule(row, rule):
                    anomaly = self.apply_rule(anomaly, rule)

                    # if rule marks suppression, skip adding
                    if anomaly.context.get("suppressed"):
                        suppressed = True
                        break
            
            if not suppressed:
                updated.append(anomaly)

        return updated
