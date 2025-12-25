"""Utility helpers for schema-driven regression modeling."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler


@dataclass
class RegressionConfig:
    min_samples: int = 40
    test_size: float = 0.2
    random_state: int = 42
    max_features: int = 30


PRIORITIZED_ROLES: List[str] = [
    "value_like",
    "income_like",
    "spend_like",
    "risk_like",
    "volume_like",
]


def _schema_dict(schema_map: Any) -> Dict[str, Any]:
    if schema_map is None:
        return {}
    if hasattr(schema_map, "model_dump"):
        return schema_map.model_dump()
    if hasattr(schema_map, "dict"):
        try:
            return schema_map.dict()
        except Exception:
            return dict(schema_map)
    if isinstance(schema_map, dict):
        return schema_map
    return {}


def _coerce_numeric(df: pd.DataFrame, column: str) -> pd.Series:
    series = df[column]
    if pd.api.types.is_numeric_dtype(series):
        return series
    return pd.to_numeric(series, errors="coerce")


def _candidate_columns(schema_blob: Dict[str, Any], key: str) -> Iterable[str]:
    blob = schema_blob.get(key) or {}
    if hasattr(blob, "model_dump"):
        blob = blob.model_dump()
    if isinstance(blob, dict):
        for value in blob.values():
            if isinstance(value, list):
                for col in value:
                    if isinstance(col, str):
                        yield col
    elif isinstance(blob, list):
        for col in blob:
            if isinstance(col, str):
                yield col


def select_regression_target(df: pd.DataFrame, schema_map: Any, config: RegressionConfig | None = None) -> Optional[str]:
    """Pick a numeric target column using semantic hints with graceful fallback."""
    config = config or RegressionConfig()
    if df is None or df.empty:
        return None

    schema_blob = _schema_dict(schema_map)
    semantic_roles = schema_blob.get("semantic_roles") or {}
    if hasattr(semantic_roles, "model_dump"):
        semantic_roles = semantic_roles.model_dump()

    candidates: List[str] = []
    for role in PRIORITIZED_ROLES:
        for col in semantic_roles.get(role, []) or []:
            candidates.append(col)

    feature_plan = schema_blob.get("feature_plan") or {}
    if hasattr(feature_plan, "model_dump"):
        feature_plan = feature_plan.model_dump()

    for bucket in ("value_features", "risk_features", "persona_features"):
        for col in feature_plan.get(bucket, []) or []:
            candidates.append(col)

    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    candidates.extend([col for col in numeric_cols if col not in candidates])

    for col in candidates:
        if col not in df.columns:
            continue
        series = _coerce_numeric(df, col)
        usable = series.dropna()
        if len(usable) < config.min_samples:
            continue
        if usable.nunique() < 5:
            continue
        if float(usable.std(ddof=0) or 0) == 0:
            continue
        return col
    return None


def select_regression_features(
    df: pd.DataFrame,
    target_column: str,
    schema_map: Any,
    config: RegressionConfig | None = None,
    allow_non_numeric: bool = False,
) -> List[str]:
    config = config or RegressionConfig()
    schema_blob = _schema_dict(schema_map)

    preferred: List[str] = []
    feature_plan = schema_blob.get("feature_plan") or {}
    if hasattr(feature_plan, "model_dump"):
        feature_plan = feature_plan.model_dump()

    for bucket in (
        "value_features",
        "risk_features",
        "persona_features",
        "clustering_features",
    ):
        for col in feature_plan.get(bucket, []) or []:
            if col == target_column:
                continue
            preferred.append(col)

    valid = []
    seen = set()
    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()
    pool = preferred + [c for c in numeric_cols if c not in preferred]
    for col in pool:
        if col == target_column or col not in df.columns:
            continue
        if col in seen:
            continue
        if not allow_non_numeric and not pd.api.types.is_numeric_dtype(df[col]):
            continue
        series = _coerce_numeric(df, col)
        if series.dropna().nunique() < 2:
            continue
        seen.add(col)
        valid.append(col)
        if len(valid) >= config.max_features:
            break
    return valid


def describe_model_quality(r2: float) -> str:
    if r2 >= 0.75:
        return "Model captures the majority of the target variance."
    if r2 >= 0.5:
        return "Model explains a meaningful portion of the variance but can improve."
    if r2 > 0:
        return "Signal is weak; consider feature engineering or alternative targets."
    return "Model could not learn predictive signal from the available fields."



def compute_regression_insights(
    df: pd.DataFrame,
    schema_map: Any,
    config: RegressionConfig | None = None,
    preferred_target: Optional[str] = None,
    feature_whitelist: Optional[List[str]] = None,
    model_type: Optional[str] = None,
    include_categoricals: bool = False,
    fast_mode: bool = False,
) -> Dict[str, Any]:
    config = config or RegressionConfig()
    if df is None or df.empty:
        return {"status": "skipped", "reason": "Dataset is empty."}

    whitelist = [col for col in (feature_whitelist or []) if isinstance(col, str) and col in df.columns]

    target_col = None
    if preferred_target and preferred_target in df.columns:
        series = _coerce_numeric(df, preferred_target)
        usable = series.dropna()
        if len(usable) >= config.min_samples and usable.nunique() >= 5 and float(usable.std(ddof=0) or 0) != 0:
            target_col = preferred_target
    if not target_col:
        target_col = select_regression_target(df, schema_map, config)
    if not target_col:
        return {"status": "skipped", "reason": "No numeric target met the regression criteria."}

    allow_non_numeric = include_categoricals
    if whitelist:
        feature_cols = [col for col in whitelist if col != target_col]
    else:
        feature_cols = select_regression_features(
            df, target_col, schema_map, config, allow_non_numeric=allow_non_numeric
        )
    if not feature_cols:
        return {"status": "skipped", "target_column": target_col, "reason": "No usable predictors were found."}

    target_series = _coerce_numeric(df, target_col)
    base_frame = df[feature_cols].copy()
    numeric_subset = base_frame.select_dtypes(include=np.number).columns.tolist()
    for col in numeric_subset:
        base_frame[col] = pd.to_numeric(base_frame[col], errors="coerce")

    if include_categoricals:
        categorical_cols = [col for col in base_frame.columns if not pd.api.types.is_numeric_dtype(base_frame[col])]
        if categorical_cols:
            base_frame = pd.get_dummies(base_frame, columns=categorical_cols, drop_first=True)
    else:
        base_frame = base_frame.apply(pd.to_numeric, errors="coerce")

    mask = target_series.notna()
    base_frame = base_frame.loc[mask]
    target_series = target_series.loc[mask]
    model_feature_names = list(base_frame.columns)

    if not model_feature_names:
        return {"status": "skipped", "target_column": target_col, "reason": "Selected features could not be encoded."}

    if len(base_frame) < config.min_samples:
        return {
            "status": "skipped",
            "target_column": target_col,
            "reason": f"Need at least {config.min_samples} rows with target values; found {len(base_frame)}.",
        }

    sample_limit = 2000
    if fast_mode and len(base_frame) > sample_limit:
        sampled = base_frame.sample(n=sample_limit, random_state=config.random_state)
        target_series = target_series.loc[sampled.index]
        base_frame = sampled
        model_feature_names = list(base_frame.columns)

    X_train, X_test, y_train, y_test = train_test_split(
        base_frame,
        target_series,
        test_size=config.test_size,
        random_state=config.random_state,
    )

    if len(X_test) < 5:
        return {
            "status": "skipped",
            "target_column": target_col,
            "reason": "Holdout split too small for evaluation.",
        }

    normalized_model = (model_type or "random_forest").lower()
    if normalized_model == "linear":
        estimator = LinearRegression()
        steps = [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler(with_mean=False)),
            ("regressor", estimator),
        ]
    elif normalized_model == "gradient_boosting":
        estimator = GradientBoostingRegressor(random_state=config.random_state)
        steps = [("imputer", SimpleImputer(strategy="median")), ("regressor", estimator)]
    else:
        n_estimators = 100 if fast_mode else 200
        estimator = RandomForestRegressor(
            n_estimators=n_estimators,
            random_state=config.random_state,
            n_jobs=-1,
        )
        normalized_model = "random_forest"
        steps = [("imputer", SimpleImputer(strategy="median")), ("regressor", estimator)]

    pipeline = Pipeline(steps=steps)
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    r2 = float(r2_score(y_test, y_pred))
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    regressor = pipeline.named_steps["regressor"]
    driver_pairs: List[Dict[str, float]] = []
    weights = None
    if hasattr(regressor, "feature_importances_"):
        weights = regressor.feature_importances_
    elif hasattr(regressor, "coef_"):
        coef = getattr(regressor, "coef_")
        if isinstance(coef, np.ndarray):
            if coef.ndim > 1:
                coef = coef[0]
            weights = np.abs(coef)
    if weights is not None and len(weights) == len(model_feature_names):
        driver_pairs = sorted(
            (
                {"feature": model_feature_names[idx], "importance": float(weight)}
                for idx, weight in enumerate(weights)
            ),
            key=lambda item: item["importance"],
            reverse=True,
        )[: min(10, len(model_feature_names))]

    preview = pd.DataFrame({"actual": y_test, "predicted": y_pred})
    preview["error"] = preview["predicted"] - preview["actual"]
    preview_records = [
        {
            "actual": float(row["actual"]),
            "predicted": float(row["predicted"]),
            "error": float(row["error"]),
        }
        for row in preview.head(20).to_dict(orient="records")
    ]

    target_stats = {
        "mean": float(target_series.mean()),
        "median": float(target_series.median()),
        "std": float(target_series.std(ddof=0) or 0),
        "min": float(target_series.min()),
        "max": float(target_series.max()),
    }

    return {
        "status": "ok",
        "target_column": target_col,
        "feature_columns": feature_cols,
        "row_count": int(len(base_frame)),
        "model": normalized_model,
        "metrics": {"r2": r2, "mae": mae, "rmse": rmse},
        "drivers": driver_pairs,
        "predictions": preview_records,
        "split": {"train_rows": int(len(X_train)), "test_rows": int(len(X_test))},
        "target_stats": target_stats,
        "narrative": describe_model_quality(r2),
        "input_config": {
            "preferred_target": preferred_target,
            "feature_whitelist": whitelist,
            "include_categoricals": include_categoricals,
            "fast_mode": fast_mode,
        },
    }
