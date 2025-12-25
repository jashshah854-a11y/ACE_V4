import json
import pandas as pd
from .flattener import Flattener


class NDJSONParser:
    def load(self, path: str):
        records = []
        with open(path, "r", encoding="utf8") as f:
            for line in f:
                if not line.strip():
                    continue
                obj = json.loads(line)
                records.append(obj)

        flat = Flattener().flatten_records(records)
        return pd.DataFrame(flat)
