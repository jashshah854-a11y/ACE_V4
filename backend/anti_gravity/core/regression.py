"""Utility helpers for schema-driven regression modeling."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, RandomForestClassifier, GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, Ridge, LogisticRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, roc_auc_score, f1_score
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier, XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False


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


def _is_id_column(name: str) -> bool:
    lowered = name.lower()
    if lowered in {"id", "index", "uuid", "guid"}:
        return True
    if lowered.endswith("_id") or lowered.startswith("id_"):
        return True
    # Handle CamelCase like "CustomerId" -> check if ends with "id" after a letter
    if lowered.endswith("id") and len(lowered) > 2 and lowered[-3].isalpha():
        return True
    return any(token in lowered for token in ("uuid", "guid", "identifier"))


def _near_constant(series: pd.Series, threshold: float = 0.98) -> bool:
    values = series.dropna()
    if values.empty:
        return True
    top_ratio = values.value_counts(normalize=True).iloc[0]
    return float(top_ratio) >= threshold


def _infer_target_type(series: pd.Series) -> str:
    values = series.dropna().unique()
    unique_count = len(values)
    if unique_count <= 2:
        return "binary"
    if unique_count <= 10:
        return "multiclass"
    return "continuous"


def _compute_vif(frame: pd.DataFrame) -> Dict[str, float]:
    if frame.shape[1] < 2:
        return {}
    filled = frame.fillna(frame.median(numeric_only=True))
    vif_by_feature: Dict[str, float] = {}
    for col in filled.columns:
        y = filled[col]
        x = filled.drop(columns=[col])
        if x.shape[1] == 0:
            vif_by_feature[col] = 1.0
            continue
        model = LinearRegression()
        model.fit(x, y)
        r2 = model.score(x, y)
        if r2 >= 0.9999:
            vif = float("inf")
        else:
            vif = 1.0 / (1.0 - r2)
        vif_by_feature[col] = float(vif)
    return vif_by_feature


def _linear_relation(series_x: pd.Series, series_y: pd.Series) -> Tuple[float, float, float]:
    aligned = pd.concat([series_x, series_y], axis=1).dropna()
    if aligned.empty:
        return 0.0, 0.0, float("inf")
    x = aligned.iloc[:, 0].values
    y = aligned.iloc[:, 1].values
    coeffs = np.polyfit(x, y, 1)
    y_pred = coeffs[0] * x + coeffs[1]
    residual_std = float(np.std(y - y_pred))
    return float(coeffs[0]), float(coeffs[1]), residual_std


def _standardize_frame(frame: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, float], Dict[str, float]]:
    means = frame.mean()
    stds = frame.std(ddof=0).replace(0, 1.0)
    standardized = (frame - means) / stds
    return standardized, means.to_dict(), stds.to_dict()


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
    target_tokens = ("target", "outcome", "label", "response", "y")
    target_named = [
        col
        for col in numeric_cols
        if col.lower() in target_tokens or any(token in col.lower() for token in target_tokens)
    ]
    candidates.extend([col for col in target_named if col not in candidates])
    candidates.extend([col for col in numeric_cols if col not in candidates])

    for col in candidates:
        if col not in df.columns:
            continue
        if _is_id_column(col):
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


def infer_target_from_question(question: str, columns: List[str]) -> Optional[str]:
    """Extract likely target column from a natural language question."""
    if not question or not columns:
        return None

    question_lower = question.lower()

    # Common target keywords mapped to column name patterns
    target_hints = {
        "churn": ["churn", "churned", "attrition", "left", "exited"],
        "buy": ["purchase", "bought", "conversion", "converted", "buy"],
        "risk": ["risk", "risky", "default", "defaulted", "fraud"],
        "outcome": ["outcome", "result", "target", "label", "response"],
        "value": ["value", "revenue", "sales", "amount", "total"],
        "score": ["score", "rating", "grade"],
    }

    # Check which keywords appear in the question
    detected_intents = []
    for intent, keywords in target_hints.items():
        for kw in keywords:
            if kw in question_lower:
                detected_intents.append(intent)
                break

    # Look for columns matching detected intents
    for col in columns:
        col_lower = col.lower()
        for intent in detected_intents:
            for pattern in target_hints.get(intent, []):
                if pattern in col_lower:
                    return col

    return None


def select_classification_target(df: pd.DataFrame, schema_map: Any, config: RegressionConfig | None = None) -> Optional[str]:
    """Pick a binary/categorical target column suitable for classification."""
    config = config or RegressionConfig()
    if df is None or df.empty:
        return None

    # Classification target keywords
    target_keywords = ("churn", "churned", "target", "outcome", "label", "class",
                       "default", "fraud", "risk", "attrition", "converted", "response")

    numeric_cols = df.select_dtypes(include=np.number).columns.tolist()

    # First pass: look for binary columns with target-like names
    for col in numeric_cols:
        col_lower = col.lower()
        if any(kw in col_lower for kw in target_keywords):
            series = df[col].dropna()
            if len(series) >= config.min_samples and series.nunique() in (2, 3):
                return col

    # Second pass: any binary numeric column
    for col in numeric_cols:
        if _is_id_column(col):
            continue
        series = df[col].dropna()
        if len(series) >= config.min_samples and series.nunique() == 2:
            return col

    return None


def describe_model_quality(r2: float) -> str:
    if r2 >= 0.75:
        return "Holdout fit is strong relative to the mean baseline."
    if r2 >= 0.5:
        return "Holdout fit is moderate relative to the mean baseline."
    if r2 > 0:
        return "Holdout fit is weak; consider feature engineering or alternative targets."
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
        # Allow binary/multiclass targets (nunique >= 2) for classification, or continuous (nunique >= 5)
        has_variance = float(usable.std(ddof=0) or 0) != 0
        is_valid_target = len(usable) >= config.min_samples and usable.nunique() >= 2 and has_variance
        if is_valid_target:
            target_col = preferred_target
    if not target_col:
        target_col = select_regression_target(df, schema_map, config)
    if not target_col:
        return {"status": "skipped", "reason": "No numeric target met the regression criteria."}

    allow_non_numeric = include_categoricals
    if whitelist:
        candidate_features = [col for col in whitelist if col != target_col]
    else:
        candidate_features = select_regression_features(
            df, target_col, schema_map, config, allow_non_numeric=allow_non_numeric
        )
    if not candidate_features:
        return {"status": "skipped", "target_column": target_col, "reason": "No usable predictors were found."}

    target_series = _coerce_numeric(df, target_col)
    target_type = _infer_target_type(target_series)

    detected_types = {"numeric": [], "boolean": [], "categorical": []}
    excluded: List[Dict[str, str]] = []
    included: List[str] = []

    for col in candidate_features:
        series = df[col]
        if _is_id_column(col):
            excluded.append({"feature": col, "reason": "id_field"})
            continue
        if pd.api.types.is_datetime64_any_dtype(series) or any(token in col.lower() for token in ("date", "time", "timestamp")):
            excluded.append({"feature": col, "reason": "raw_timestamp"})
            continue
        numeric_series = _coerce_numeric(df, col)
        if numeric_series.dropna().nunique() <= 1:
            excluded.append({"feature": col, "reason": "constant"})
            continue
        if _near_constant(series):
            excluded.append({"feature": col, "reason": "near_constant"})
            continue
        if pd.api.types.is_bool_dtype(series):
            detected_types["boolean"].append(col)
        elif pd.api.types.is_numeric_dtype(series):
            detected_types["numeric"].append(col)
        else:
            detected_types["categorical"].append(col)
        included.append(col)

    feature_governance_report = {
        "included_features": included,
        "excluded_features": excluded,
        "detected_types": detected_types,
    }

    if not included:
        return {
            "status": "skipped",
            "target_column": target_col,
            "target_type": target_type,
            "reason": "All candidate features were excluded by governance rules.",
            "feature_governance_report": feature_governance_report,
        }

    base_frame = df[included].copy()
    numeric_subset = base_frame.select_dtypes(include=np.number).columns.tolist()
    for col in numeric_subset:
        base_frame[col] = pd.to_numeric(base_frame[col], errors="coerce")

    if include_categoricals:
        categorical_cols = [col for col in base_frame.columns if not pd.api.types.is_numeric_dtype(base_frame[col])]
        if categorical_cols:
            base_frame = pd.get_dummies(base_frame, columns=categorical_cols, drop_first=True)
    else:
        base_frame = base_frame.apply(pd.to_numeric, errors="coerce")

    total_rows = len(base_frame)
    mask = target_series.notna()
    missing_target = int((~mask).sum())
    base_frame = base_frame.loc[mask]
    target_series = target_series.loc[mask]
    model_feature_names = list(base_frame.columns)

    if not model_feature_names:
        return {
            "status": "skipped",
            "target_column": target_col,
            "target_type": target_type,
            "reason": "Selected features could not be encoded.",
            "feature_governance_report": feature_governance_report,
        }

    if len(base_frame) < config.min_samples:
        return {
            "status": "skipped",
            "target_column": target_col,
            "target_type": target_type,
            "reason": f"Need at least {config.min_samples} rows with target values; found {len(base_frame)}.",
            "feature_governance_report": feature_governance_report,
        }

    sample_limit = 2000
    if fast_mode and len(base_frame) > sample_limit:
        sampled = base_frame.sample(n=sample_limit, random_state=config.random_state)
        target_series = target_series.loc[sampled.index]
        base_frame = sampled
        model_feature_names = list(base_frame.columns)

    vif_by_feature = _compute_vif(base_frame[numeric_subset]) if numeric_subset else {}
    max_vif = max(vif_by_feature.values()) if vif_by_feature else None
    collinearity_decision = "standard"
    if max_vif is not None and max_vif >= 20:
        collinearity_decision = "suppress_coefficients"
    elif max_vif is not None and max_vif >= 10:
        collinearity_decision = "use_ridge_and_permutation"

    collinearity_report = {
        "vif_by_feature": vif_by_feature,
        "max_vif": max_vif,
        "decision": collinearity_decision,
    }

    leakage_pairs: List[Dict[str, Any]] = []
    target_pairs: List[Dict[str, Any]] = []
    leakage_features = base_frame.select_dtypes(include=np.number)
    if leakage_features.shape[1] >= 2:
        corr_matrix = leakage_features.corr()
        for i, col1 in enumerate(corr_matrix.columns):
            for col2 in corr_matrix.columns[i + 1:]:
                corr_val = float(corr_matrix.loc[col1, col2])
                if abs(corr_val) >= 0.995:
                    slope, intercept, residual_std = _linear_relation(leakage_features[col1], leakage_features[col2])
                    leakage_pairs.append(
                        {
                            "feature1": col1,
                            "feature2": col2,
                            "correlation": corr_val,
                            "linear_relation": {"slope": slope, "intercept": intercept, "residual_std": residual_std},
                        }
                    )
    for col in leakage_features.columns:
        corr_val = leakage_features[col].corr(target_series)
        if pd.notna(corr_val) and abs(float(corr_val)) >= 0.995:
            slope, intercept, residual_std = _linear_relation(leakage_features[col], target_series)
            target_pairs.append(
                {
                    "feature": col,
                    "target": target_col,
                    "correlation": float(corr_val),
                    "linear_relation": {"slope": slope, "intercept": intercept, "residual_std": residual_std},
                }
            )

    suppression_actions = []
    if target_pairs:
        suppression_actions.append("suppress_predictive_language")

    leakage_report = {
        "flagged_pairs": leakage_pairs,
        "flagged_target_pairs": target_pairs,
        "suppression_actions_taken": suppression_actions,
    }

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
            "target_type": target_type,
            "reason": "Holdout split too small for evaluation.",
            "feature_governance_report": feature_governance_report,
        }

    normalized_model = (model_type or "random_forest").lower()
    is_classification = target_type in {"binary", "multiclass"}
    model_selection_info: Dict[str, Any] = {}
    if is_classification:
        if target_type == "binary":
            # Check class imbalance
            class_counts = y_train.value_counts()
            minority_ratio = class_counts.min() / class_counts.sum()
            is_imbalanced = minority_ratio < 0.3  # Less than 30% minority class

            # Define candidate models with class balancing for imbalanced data
            n_est = 100 if fast_mode else 200
            candidates = {
                "logistic_regression": LogisticRegression(
                    max_iter=1000,
                    class_weight="balanced" if is_imbalanced else None,
                    random_state=config.random_state,
                ),
                "random_forest": RandomForestClassifier(
                    n_estimators=n_est,
                    class_weight="balanced" if is_imbalanced else None,
                    random_state=config.random_state,
                    n_jobs=-1,
                ),
                "gradient_boosting": GradientBoostingClassifier(
                    n_estimators=n_est,
                    random_state=config.random_state,
                ),
            }
            if HAS_XGBOOST:
                # Compute scale_pos_weight for imbalanced binary classification
                scale_weight = float(class_counts.max() / class_counts.min()) if is_imbalanced else 1.0
                candidates["xgboost"] = XGBClassifier(
                    n_estimators=n_est,
                    scale_pos_weight=scale_weight,
                    random_state=config.random_state,
                    eval_metric="logloss",
                    verbosity=0,
                    n_jobs=-1,
                )

            # Quick cross-validation to select best model (use f1 for imbalanced)
            scoring = "f1" if is_imbalanced else "accuracy"
            best_score = -1.0
            best_model_name = "logistic_regression"
            cv_folds = 3 if fast_mode else 5

            # Prepare data for CV (need to impute first)
            imputer = SimpleImputer(strategy="most_frequent")
            X_train_imputed = pd.DataFrame(imputer.fit_transform(X_train), columns=X_train.columns)

            for name, clf in candidates.items():
                try:
                    scores = cross_val_score(clf, X_train_imputed, y_train, cv=cv_folds, scoring=scoring, n_jobs=-1)
                    mean_score = float(scores.mean())
                    model_selection_info[name] = {"cv_score": round(mean_score, 4), "cv_std": round(float(scores.std()), 4)}
                    if mean_score > best_score:
                        best_score = mean_score
                        best_model_name = name
                except Exception:
                    model_selection_info[name] = {"cv_score": None, "error": "CV failed"}

            estimator = candidates[best_model_name]
            normalized_model = best_model_name
            model_selection_info["selected"] = best_model_name
            model_selection_info["selection_metric"] = scoring
            model_selection_info["is_imbalanced"] = is_imbalanced
            model_selection_info["minority_ratio"] = round(float(minority_ratio), 4)

            # Use scaler only for logistic regression
            if best_model_name == "logistic_regression":
                steps = [("imputer", SimpleImputer(strategy="most_frequent")), ("scaler", StandardScaler()), ("model", estimator)]
            else:
                steps = [("imputer", SimpleImputer(strategy="most_frequent")), ("model", estimator)]
        else:
            estimator = RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=config.random_state)
            normalized_model = "random_forest_classifier"
            steps = [("imputer", SimpleImputer(strategy="most_frequent")), ("scaler", StandardScaler()), ("model", estimator)]
    else:
        if collinearity_decision in {"use_ridge_and_permutation", "suppress_coefficients"}:
            estimator = Ridge(alpha=1.0)
            normalized_model = "ridge"
            steps = [("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler()), ("model", estimator)]
        elif normalized_model == "linear":
            estimator = LinearRegression()
            steps = [
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("model", estimator),
            ]
        elif normalized_model == "xgboost" and HAS_XGBOOST:
            n_estimators = 100 if fast_mode else 200
            estimator = XGBRegressor(
                n_estimators=n_estimators,
                random_state=config.random_state,
                verbosity=0,
                n_jobs=-1,
            )
            normalized_model = "xgboost"
            steps = [("imputer", SimpleImputer(strategy="median")), ("model", estimator)]
        elif normalized_model == "gradient_boosting":
            estimator = GradientBoostingRegressor(random_state=config.random_state)
            steps = [("imputer", SimpleImputer(strategy="median")), ("model", estimator)]
        else:
            # Auto-select best regression model via cross-validation
            n_estimators = 100 if fast_mode else 200
            reg_candidates = {
                "random_forest": RandomForestRegressor(
                    n_estimators=n_estimators,
                    random_state=config.random_state,
                    n_jobs=-1,
                ),
                "gradient_boosting": GradientBoostingRegressor(
                    n_estimators=n_estimators,
                    random_state=config.random_state,
                ),
            }
            if HAS_XGBOOST:
                reg_candidates["xgboost"] = XGBRegressor(
                    n_estimators=n_estimators,
                    random_state=config.random_state,
                    verbosity=0,
                    n_jobs=-1,
                )

            imputer = SimpleImputer(strategy="median")
            X_train_imputed = pd.DataFrame(imputer.fit_transform(X_train), columns=X_train.columns)
            cv_folds = 3 if fast_mode else 5
            best_reg_score = -np.inf
            best_reg_name = "random_forest"

            for name, reg in reg_candidates.items():
                try:
                    scores = cross_val_score(reg, X_train_imputed, y_train, cv=cv_folds, scoring="r2", n_jobs=-1)
                    mean_score = float(scores.mean())
                    model_selection_info[name] = {"cv_score": round(mean_score, 4), "cv_std": round(float(scores.std()), 4)}
                    if mean_score > best_reg_score:
                        best_reg_score = mean_score
                        best_reg_name = name
                except Exception:
                    model_selection_info[name] = {"cv_score": None, "error": "CV failed"}

            estimator = reg_candidates[best_reg_name]
            normalized_model = best_reg_name
            model_selection_info["selected"] = best_reg_name
            model_selection_info["selection_metric"] = "r2"
            steps = [("imputer", SimpleImputer(strategy="median")), ("model", estimator)]

    pipeline = Pipeline(steps=steps)
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    metrics: Dict[str, Any] = {}
    baseline_metrics: Dict[str, Any] = {}
    if is_classification:
        # Use pipeline for prediction (includes preprocessing)
        y_pred_labels = pipeline.predict(X_test)
        accuracy = float(accuracy_score(y_test, y_pred_labels))
        metrics["accuracy"] = accuracy
        if target_type == "binary":
            # Add F1 score for imbalanced data evaluation
            metrics["f1"] = float(f1_score(y_test, y_pred_labels))
            try:
                y_proba = pipeline.predict_proba(X_test)[:, 1]
                metrics["auc"] = float(roc_auc_score(y_test, y_proba))
            except Exception:
                metrics["auc"] = None
        baseline_label = y_train.value_counts().idxmax()
        baseline_pred = np.full_like(y_test, baseline_label)
        baseline_metrics["accuracy"] = float(accuracy_score(y_test, baseline_pred))
        baseline_metrics["f1"] = float(f1_score(y_test, baseline_pred)) if target_type == "binary" else None
    else:
        r2 = float(r2_score(y_test, y_pred))
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        metrics.update({"r2": r2, "mae": mae, "rmse": rmse})
        baseline_pred = np.full_like(y_test, y_train.mean())
        baseline_metrics["mae"] = float(mean_absolute_error(y_test, baseline_pred))
        baseline_metrics["rmse"] = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))

    scoring = "accuracy" if is_classification else "r2"
    repeats = 5 if fast_mode else 10
    perm = permutation_importance(pipeline, X_test, y_test, n_repeats=repeats, random_state=config.random_state, scoring=scoring)
    raw_importance = np.maximum(perm.importances_mean, 0)
    total_importance = float(raw_importance.sum()) if raw_importance.sum() > 0 else 1.0
    normalized_importance = raw_importance / total_importance
    importance_report = {
        "method": "permutation_importance",
        "scoring": scoring,
        "n_repeats": repeats,
        "target_column": target_col,
        "target_type": target_type,
        "features": [
            {
                "feature": model_feature_names[idx],
                "importance": float(normalized_importance[idx] * 100),
                "ci_low": float(max(0.0, (perm.importances_mean[idx] - 1.96 * perm.importances_std[idx]) / total_importance * 100)),
                "ci_high": float(max(0.0, (perm.importances_mean[idx] + 1.96 * perm.importances_std[idx]) / total_importance * 100)),
            }
            for idx in range(len(model_feature_names))
        ],
        "dataset_split": {"train_rows": int(len(X_train)), "test_rows": int(len(X_test))},
    }
    importance_report["features"].sort(key=lambda item: item["importance"], reverse=True)

    coefficient_report = None
    if not is_classification and collinearity_decision != "suppress_coefficients" and normalized_model in {"linear", "ridge"}:
        try:
            standardized, means, stds = _standardize_frame(X_train)
            X_mat = np.column_stack([np.ones(len(standardized)), standardized.values])
            y_vec = y_train.values
            beta, _, _, _ = np.linalg.lstsq(X_mat, y_vec, rcond=None)
            predictions = X_mat @ beta
            residuals = y_vec - predictions
            dof = max(1, len(y_vec) - X_mat.shape[1])
            mse = np.sum(residuals ** 2) / dof
            cov = mse * np.linalg.inv(X_mat.T @ X_mat)
            se = np.sqrt(np.diag(cov))
            t_stats = beta / se
            p_values = 2 * (1 - stats.t.cdf(np.abs(t_stats), df=dof))
            ci_low = beta - stats.t.ppf(0.975, df=dof) * se
            ci_high = beta + stats.t.ppf(0.975, df=dof) * se
            coefficient_report = {
                "method": "standardized_linear_coefficients",
                "n_used": int(len(y_vec)),
                "features": [
                    {
                        "feature": "intercept" if idx == 0 else model_feature_names[idx - 1],
                        "beta": float(beta[idx]),
                        "standard_error": float(se[idx]),
                        "p_value": float(p_values[idx]),
                        "ci_low": float(ci_low[idx]),
                        "ci_high": float(ci_high[idx]),
                    }
                    for idx in range(len(beta))
                ],
            }
        except Exception:
            coefficient_report = None

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

    model_fit_report = {
        "model": normalized_model,
        "target_column": target_col,
        "target_type": target_type,
        "metrics": metrics,
        "baseline_metrics": baseline_metrics,
        "dataset_split": {"train_rows": int(len(X_train)), "test_rows": int(len(X_test))},
    }
    if model_selection_info:
        model_fit_report["model_selection"] = model_selection_info

    target_governance = {
        "target_column": target_col,
        "target_type": target_type,
        "n_used": int(len(base_frame)),
        "n_dropped": int(total_rows - len(base_frame)),
        "n_dropped_target_missing": missing_target,
    }

    narrative = ""
    if is_classification:
        accuracy = metrics.get("accuracy")
        f1 = metrics.get("f1")
        auc = metrics.get("auc")
        baseline_acc = baseline_metrics.get("accuracy", 0)

        # Use F1 for imbalanced data, accuracy otherwise
        if model_selection_info.get("is_imbalanced") and f1 is not None:
            if f1 >= 0.7:
                narrative = f"Model achieves strong F1 score ({f1:.0%}) on imbalanced data."
            elif f1 >= 0.5:
                narrative = f"Model achieves moderate F1 score ({f1:.0%}); predictions are useful but imperfect."
            elif f1 > 0.2:
                narrative = f"Model achieves weak F1 score ({f1:.0%}); treat predictions as exploratory."
            else:
                narrative = "Model struggles to identify the minority class; consider collecting more data."
        elif isinstance(accuracy, (int, float)):
            # Compare to baseline for non-imbalanced
            lift = accuracy - baseline_acc if baseline_acc else 0
            if accuracy >= 0.85 and lift >= 0.1:
                narrative = f"Model accuracy ({accuracy:.0%}) significantly exceeds baseline ({baseline_acc:.0%})."
            elif accuracy >= 0.7:
                narrative = f"Model accuracy ({accuracy:.0%}) is solid."
            elif accuracy > baseline_acc + 0.05:
                narrative = f"Model accuracy ({accuracy:.0%}) improves on baseline ({baseline_acc:.0%}) but remains moderate."
            else:
                narrative = f"Model accuracy ({accuracy:.0%}) is near baseline ({baseline_acc:.0%}); treat as exploratory."

        # Add AUC context if available
        if auc is not None and auc >= 0.7:
            narrative += f" AUC of {auc:.2f} indicates good ranking ability."
    else:
        narrative = describe_model_quality(metrics.get("r2", 0.0))

    return {
        "status": "success",
        "target_column": target_col,
        "target_type": target_type,
        "feature_columns": included,
        "row_count": int(len(base_frame)),
        "model": normalized_model,
        "model_selection": model_selection_info if model_selection_info else None,
        "metrics": metrics,
        "drivers": importance_report["features"][:10],
        "predictions": preview_records,
        "split": {"train_rows": int(len(X_train)), "test_rows": int(len(X_test))},
        "target_stats": target_stats,
        "narrative": narrative,
        "input_config": {
            "preferred_target": preferred_target,
            "feature_whitelist": whitelist,
            "include_categoricals": include_categoricals,
            "fast_mode": fast_mode,
        },
        "feature_governance_report": feature_governance_report,
        "target_governance": target_governance,
        "baseline_metrics": baseline_metrics,
        "model_fit_report": model_fit_report,
        "collinearity_report": collinearity_report,
        "leakage_report": leakage_report,
        "importance_report": importance_report,
        "regression_coefficients_report": coefficient_report,
        # Internal: trained model and data for SHAP/ONNX/drift (not serialized to state)
        "_pipeline": pipeline,
        "_X_train": X_train,
        "_X_test": X_test,
        "_feature_names": model_feature_names,
    }
