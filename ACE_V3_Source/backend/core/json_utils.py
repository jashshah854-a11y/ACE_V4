import json
import re
from typing import Any

JSON_PATTERN = re.compile(r"(\{.*\}|\[.*\])", re.DOTALL)

class JsonExtractionError(Exception):
    pass

def extract_json_block(text: str) -> Any:
    """
    Extract the first valid JSON object or array from an arbitrary LLM string.
    Raises JsonExtractionError if nothing valid can be parsed.
    """
    if not text:
        raise JsonExtractionError("Empty response")

    match = JSON_PATTERN.search(text)
    if not match:
        raise JsonExtractionError("No JSON block found in response")

    candidate = match.group(0).strip()

    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        raise JsonExtractionError(f"JSON decode failed: {e}") from e
