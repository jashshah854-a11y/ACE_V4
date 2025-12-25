import json
import pandas as pd
from .flattener import Flattener


class JSONParser:
    def load(self, path: str):
        with open(path, "r", encoding="utf8") as f:
            raw = json.load(f)

        # raw can be dict or list
        if isinstance(raw, dict):
            raw = [raw]

        flat = Flattener().flatten_records(raw)

        df = pd.DataFrame(flat)
        return df
