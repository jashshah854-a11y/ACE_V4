import os
import json

from .json_parser import JSONParser
from .ndjson_parser import NDJSONParser
from .log_parser import LogParser


class AutoLoader:
    def load(self, path: str):
        ext = os.path.splitext(path)[1].lower()

        if ext in [".json"]:
            return JSONParser().load(path)

        if ext in [".ndjson", ".jsonl"]:
            return NDJSONParser().load(path)

        if ext in [".log", ".txt"]:
            return LogParser().load(path)

        raise ValueError(f"Unsupported semi structured file type: {ext}")
