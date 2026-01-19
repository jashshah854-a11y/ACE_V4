from __future__ import annotations

import re
from typing import Any, Dict, Optional, TypedDict, Literal

AnalysisIntent = Literal["exploratory", "predictive", "causal", "automation"]


class TargetCandidate(TypedDict):
    column: Optional[str]
    reason: str
    confidence: float
    detected: bool


TARGET_NAME_TOKENS = {
    "target",
    "label",
    "outcome",
    "y",
    "churn",
    "revenue",
    "conversion",
    "score",
}

ID_TOKENS = {
    "id",
    "uuid",
    "guid",
    "hash",
    "email",
    "account",
    "customer",
    "client",
    "user",
    "session",
}

CAUSAL_TOKENS = {
    "treatment",
    "control",
    "experiment",
    "variant",
    "ab",
    "group",
}

NUMERIC_DTYPE_TOKENS = ("int", "float", "double", "decimal", "number")
BOOLEAN_DTYPE_TOKENS = ("bool", "boolean")
CATEGORICAL_DTYPE_TOKENS = ("object", "category", "string")


def classify_analysis_intent(schema: Dict[str, Any], user_target: Optional[str] = None) -> Dict[str, Any]:
    default_target: TargetCandidate = {
        "column": None,
        "reason": "no_usable_target_found",
        "confidence": 0.0,
        "detected": False,
    }
    default_response = {"intent": "exploratory", "target_candidate": default_target}

    try:
        if user_target:
            return {
                "intent": "predictive",
                "target_candidate": {
                    "column": user_target,
                    "reason": "user_target_specified",
                    "confidence": 1.0,
                    "detected": True,
                },
            }

        columns = _extract_columns(schema)
        row_count = _extract_row_count(schema)

        candidate_column = None
        candidate_confidence = 0.0
        candidate_reason = ""

        for col_name, meta in columns.items():
            if not col_name:
                continue
            if _is_id_like(col_name, meta, row_count):
                continue

            name_match = _has_target_name(col_name)
            dtype = str((meta or {}).get("dtype") or (meta or {}).get("type") or "").lower()
            distinct_count = _distinct_count(meta, row_count)
            is_binary = distinct_count is not None and distinct_count <= 2 or _is_boolean_dtype(dtype)
            is_low_card = distinct_count is not None and distinct_count <= 20
            is_numeric = _is_numeric_dtype(dtype)
            has_variance = _has_variance(meta)

            score = 0.0
            reason = ""

            if is_binary:
                if name_match:
                    score = 0.9
                    reason = "name_match_binary"
                else:
                    score = 0.6
                    reason = "binary_profile"
            elif is_low_card:
                if name_match:
                    score = 0.8
                    reason = "name_match_low_cardinality"
                else:
                    score = 0.55
                    reason = "low_cardinality_profile"
            elif is_numeric and has_variance and name_match:
                score = 0.75
                reason = "name_match_numeric_variance"

            if score > candidate_confidence:
                candidate_confidence = score
                candidate_column = col_name
                candidate_reason = reason

        if candidate_column and candidate_confidence >= 0.55:
            return {
                "intent": "predictive",
                "target_candidate": {
                    "column": candidate_column,
                    "reason": candidate_reason,
                    "confidence": round(min(candidate_confidence, 1.0), 3),
                    "detected": True,
                },
            }

        if _has_causal_signals(columns):
            return {
                "intent": "causal",
                "target_candidate": default_target,
            }

        return default_response
    except Exception:
        return default_response


def _extract_columns(schema: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    if not isinstance(schema, dict):
        return {}

    columns = schema.get("columns")
    if isinstance(columns, dict):
        return columns

    basic_types = schema.get("basic_types")
    if isinstance(basic_types, dict):
        merged: Dict[str, Dict[str, Any]] = {}
        for dtype, cols in basic_types.items():
            if not isinstance(cols, list):
                continue
            for col in cols:
                merged.setdefault(str(col), {})["dtype"] = dtype
        stats = schema.get("stats")
        if isinstance(stats, dict):
            for col, meta in stats.items():
                merged.setdefault(str(col), {}).update(meta if isinstance(meta, dict) else {})
        return merged

    return {}


def _extract_row_count(schema: Dict[str, Any]) -> Optional[int]:
    if not isinstance(schema, dict):
        return None
    direct = schema.get("row_count")
    if isinstance(direct, int):
        return direct
    info = schema.get("dataset_info")
    if isinstance(info, dict):
        row_count = info.get("row_count")
        if isinstance(row_count, int):
            return row_count
    return None


def _distinct_count(meta: Optional[Dict[str, Any]], row_count: Optional[int]) -> Optional[int]:
    if not isinstance(meta, dict):
        return None
    distinct_count = meta.get("distinct_count")
    if isinstance(distinct_count, int):
        return distinct_count
    distinct_pct = meta.get("distinct_pct")
    if isinstance(distinct_pct, (int, float)) and row_count:
        return max(1, int(round(distinct_pct * row_count)))
    return None


def _tokenize(name: str) -> list[str]:
    return [token for token in re.split(r"[^a-z0-9]+", name.lower()) if token]


def _has_target_name(name: str) -> bool:
    tokens = _tokenize(name)
    return any(token in TARGET_NAME_TOKENS for token in tokens)


def _is_id_like(name: str, meta: Optional[Dict[str, Any]], row_count: Optional[int]) -> bool:
    tokens = _tokenize(name)
    if any(token in ID_TOKENS for token in tokens):
        return True

    distinct_pct = None
    if isinstance(meta, dict):
        distinct_pct = meta.get("distinct_pct")
    if isinstance(distinct_pct, (int, float)) and distinct_pct >= 0.98:
        return True

    if "name" in tokens and isinstance(distinct_pct, (int, float)) and distinct_pct >= 0.9:
        return True

    distinct_count = _distinct_count(meta, row_count)
    if row_count and distinct_count and row_count > 0:
        if distinct_count / row_count >= 0.98:
            return True

    return False


def _is_numeric_dtype(dtype: str) -> bool:
    return any(token in dtype for token in NUMERIC_DTYPE_TOKENS)


def _is_boolean_dtype(dtype: str) -> bool:
    return any(token in dtype for token in BOOLEAN_DTYPE_TOKENS)


def _has_variance(meta: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(meta, dict):
        return False
    std = meta.get("std")
    if isinstance(std, (int, float)):
        return std > 1e-6
    min_val = meta.get("min")
    max_val = meta.get("max")
    if isinstance(min_val, (int, float)) and isinstance(max_val, (int, float)):
        return abs(max_val - min_val) > 1e-6
    return False


def _has_causal_signals(columns: Dict[str, Dict[str, Any]]) -> bool:
    for col in columns.keys():
        tokens = _tokenize(str(col))
        if any(token in CAUSAL_TOKENS for token in tokens):
            return True
    return False
