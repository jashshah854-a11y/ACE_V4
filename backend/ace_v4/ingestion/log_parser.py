import re
import pandas as pd


class LogParser:
    # simple key=value extractor
    KV_PATTERN = re.compile(r"(\w+)=([\w:.\/\-\[\]]+)")

    def load(self, path: str):
        rows = []
        with open(path, "r", encoding="utf8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                kv_pairs = dict(re.findall(self.KV_PATTERN, line))
                row = {
                    "raw_line": line,
                    **kv_pairs
                }
                rows.append(row)

        return pd.DataFrame(rows)
