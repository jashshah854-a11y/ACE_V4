import json
import os

class RuleLoader:
    def __init__(self, rule_file="rules.json"):
        base = os.path.dirname(__file__)
        self.rule_path = os.path.join(base, rule_file)

    def load_rules(self):
        with open(self.rule_path, "r") as f:
            rules = json.load(f)
        return rules
