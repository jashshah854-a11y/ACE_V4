"""Analyst Core - governs model selection and explainability compliance."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from .explainability import EvidenceObject, FeatureImportanceEntry, IExplainableModel


class ModelGovernanceError(RuntimeError):
    """Raised when a requested model violates the explainability policy."""


@dataclass
class ModelDecision:
    model: Optional[IExplainableModel]
    warnings: List[str]
    downgraded: bool = False


class ExplainableLinearRegression(IExplainableModel):
    def __init__(self):
        self.model = LinearRegression()
        self.columns: List[str] = []
        self.score_: float = 0.0
        self.residual_std_: float = 0.0

    @property
    def name(self) -> str:
        return "linear_regression"

    def fit(self, X, y=None) -> None:
        if y is None:
            raise ValueError("Linear regression requires a target column.")
        self.columns = list(X.columns)
        self.model.fit(X, y)
        preds = self.model.predict(X)
        residuals = y - preds
        self.residual_std_ = float(np.std(residuals))
        self.score_ = float(self.model.score(X, y))

    def predict(self, X) -> ModelOutputEnvelope:
        from .explainability import ModelOutputEnvelope

        preds = self.model.predict(X)
        rows = [{"index": idx, "prediction": float(val)} for idx, val in enumerate(preds)]
        envelope = ModelOutputEnvelope(entity="Predictions", values=rows)
        envelope.validate()
        return envelope

    def get_evidence(self) -> EvidenceObject:
        return EvidenceObject(
            columns_used=self.columns,
            computation_method="Linear Regression",
            result_statistic={"r2": self.score_, "residual_std": self.residual_std_},
            confidence_level=max(0.0, min(0.99, (self.score_ + 1) / 2)) * 100,
            source_code=f"LinearRegression()\n.fit(df[{', '.join(self.columns)}], target)",
            data_source="governed_feature_frame",
            source_notes="Trained on sanitized feature matrix within ModelSelector.",
        )

    def get_feature_importance(self) -> List[FeatureImportanceEntry]:
        if not self.columns:
            return []
        coefs = self.model.coef_
        return [FeatureImportanceEntry(feature=col, importance=float(abs(w))) for col, w in zip(self.columns, coefs)]

    def get_confidence_interval(self) -> Tuple[float, float]:
        bound = 1.96 * self.residual_std_
        return (-bound, bound)

    def serialize_artifacts(self) -> Dict[str, Any]:
        return {
            "coefficients": {col: float(w) for col, w in zip(self.columns, self.model.coef_)},
            "intercept": float(self.model.intercept_),
        }


class ExplainableLogisticRegression(IExplainableModel):
    def __init__(self):
        self.model = LogisticRegression(max_iter=500)
        self.columns: List[str] = []
        self.score_: float = 0.0

    @property
    def name(self) -> str:
        return "logistic_regression"

    def fit(self, X, y=None) -> None:
        if y is None:
            raise ValueError("Logistic regression requires a target column.")
        self.columns = list(X.columns)
        self.model.fit(X, y)
        self.score_ = float(self.model.score(X, y))

    def predict(self, X) -> ModelOutputEnvelope:
        from .explainability import ModelOutputEnvelope

        proba = self.model.predict_proba(X)
        rows = []
        for idx, probs in enumerate(proba):
            rows.append({"index": idx, "probabilities": {cls: float(p) for cls, p in zip(self.model.classes_, probs)}})
        envelope = ModelOutputEnvelope(entity="Class Probabilities", values=rows)
        envelope.validate()
        return envelope

    def get_evidence(self) -> EvidenceObject:
        return EvidenceObject(
            columns_used=self.columns,
            computation_method="Logistic Regression",
            result_statistic={"accuracy": self.score_},
            confidence_level=max(0.0, min(0.99, (self.score_ + 1) / 2)) * 100,
            source_code=f"LogisticRegression(max_iter=500)\n.fit(df[{', '.join(self.columns)}], target)",
            data_source="governed_feature_frame",
            source_notes="Classification run using white-box logistic regression.",
        )

    def get_feature_importance(self) -> List[FeatureImportanceEntry]:
        if not self.columns:
            return []
        coefs = np.mean(np.abs(self.model.coef_), axis=0)
        return [FeatureImportanceEntry(feature=col, importance=float(weight)) for col, weight in zip(self.columns, coefs)]

    def get_confidence_interval(self) -> Tuple[float, float]:
        err = max(0.01, 1 - self.score_)
        return (self.score_ - err, min(1.0, self.score_ + err))

    def serialize_artifacts(self) -> Dict[str, Any]:
        return {
            "coefficients": {col: float(weight) for col, weight in zip(self.columns, self.model.coef_[0])},
            "classes": self.model.classes_.tolist(),
        }


class ExplainableDecisionTree(IExplainableModel):
    def __init__(self, task: str = "classification"):
        self.task = task
        if task == "classification":
            self.model = DecisionTreeClassifier(max_depth=4, random_state=42)
        else:
            self.model = DecisionTreeRegressor(max_depth=4, random_state=42)
        self.columns: List[str] = []
        self.score_: float = 0.0

    @property
    def name(self) -> str:
        return f"decision_tree_{self.task}"

    def fit(self, X, y=None) -> None:
        if y is None:
            raise ValueError("Decision trees require a target column.")
        self.columns = list(X.columns)
        self.model.fit(X, y)
        self.score_ = float(self.model.score(X, y))

    def predict(self, X) -> ModelOutputEnvelope:
        from .explainability import ModelOutputEnvelope

        preds = self.model.predict(X)
        rows = [{"index": idx, "prediction": float(val)} for idx, val in enumerate(preds)]
        envelope = ModelOutputEnvelope(entity="Tree Predictions", values=rows)
        envelope.validate()
        return envelope

    def get_evidence(self) -> EvidenceObject:
        return EvidenceObject(
            columns_used=self.columns,
            computation_method=f"Decision Tree ({self.task})",
            result_statistic={"score": self.score_},
            confidence_level=max(0.0, min(0.99, (self.score_ + 1) / 2)) * 100,
            source_code=f"DecisionTree{self.task.title()}(max_depth=4)\n.fit(df[{', '.join(self.columns)}], target)",
            data_source="governed_feature_frame",
            source_notes="Explainable depth-limited tree executed under ModelSelector.",
        )

    def get_feature_importance(self) -> List[FeatureImportanceEntry]:
        if not self.columns:
            return []
        importances = self.model.feature_importances_
        return [FeatureImportanceEntry(feature=col, importance=float(weight)) for col, weight in zip(self.columns, importances)]

    def get_confidence_interval(self) -> Tuple[float, float]:
        err = max(0.05, 1 - self.score_)
        return (self.score_ - err, min(1.0, self.score_ + err))

    def serialize_artifacts(self) -> Dict[str, Any]:
        return {"feature_importance": {col: float(weight) for col, weight in zip(self.columns, self.model.feature_importances_)}}


class ExplainableKMeans(IExplainableModel):
    def __init__(self, base_model: KMeans, columns_used: List[str], silhouette: float):
        self.model = base_model
        self.columns = columns_used
        self.silhouette = silhouette

    @property
    def name(self) -> str:
        return "kmeans"

    def fit(self, X, y=None) -> None:
        # KMeans is already fit upstream; no-op for interface compliance
        return None

    def predict(self, X) -> ModelOutputEnvelope:
        from .explainability import ModelOutputEnvelope

        labels = self.model.predict(X)
        rows = [{"index": idx, "cluster": int(label)} for idx, label in enumerate(labels)]
        envelope = ModelOutputEnvelope(entity="Customer Segments", values=rows)
        envelope.validate()
        return envelope

    def get_evidence(self) -> EvidenceObject:
        stats = {"silhouette": self.silhouette, "k": self.model.n_clusters}
        confidence = max(0.0, min(0.99, (self.silhouette + 1) / 2)) * 100
        return EvidenceObject(
            columns_used=self.columns,
            computation_method=f"KMeans (k={self.model.n_clusters})",
            result_statistic=stats,
            confidence_level=confidence,
            source_code=f"KMeans(n_clusters={self.model.n_clusters}).fit(df[{', '.join(self.columns)}])",
            data_source="cluster_feature_frame",
            source_notes="Auto-K selection run inside universal clustering engine.",
        )

    def get_feature_importance(self) -> List[FeatureImportanceEntry]:
        if not hasattr(self.model, "cluster_centers_"):
            return []
        centers = self.model.cluster_centers_
        deviations = np.abs(centers - centers.mean(axis=0))
        importance = deviations.mean(axis=0)
        return [FeatureImportanceEntry(feature=col, importance=float(weight)) for col, weight in zip(self.columns, importance)]

    def get_confidence_interval(self) -> Tuple[float, float]:
        err = max(0.01, (1 - self.silhouette) / 2)
        return (self.silhouette - err, min(1.0, self.silhouette + err))

    def serialize_artifacts(self) -> Dict[str, Any]:
        return {
            "centroids": self.model.cluster_centers_.tolist(),
            "inertia": getattr(self.model, "inertia_", None),
        }


class ModelSelector:
    """Registry of safe algorithms."""

    def ensure_clustering_allowed(self, rows: int, features: int) -> None:
        if features > 200 or rows > 1_000_000:
            raise ModelGovernanceError(
                "Complex clustering would require an opaque model. Downgrade requested scope or reduce features."
            )

    def ensure_supervised_allowed(self, rows: int, features: int) -> None:
        if features > 300:
            raise ModelGovernanceError(
                "Feature count exceeds white-box capacity. Simplify the question or engineer more concise features."
            )

    def get_regressor(self) -> ExplainableLinearRegression:
        return ExplainableLinearRegression()

    def get_classifier(self, prefer_tree: bool = False) -> IExplainableModel:
        return ExplainableDecisionTree("classification") if prefer_tree else ExplainableLogisticRegression()

    def wrap_kmeans(self, base_model: KMeans, columns: List[str], silhouette: float) -> ExplainableKMeans:
        return ExplainableKMeans(base_model, columns, silhouette)

