"""
Chart generation for ACE reports.

Generates static PNG/SVG charts for embedding in markdown reports.
Uses matplotlib for reliable cross-platform chart generation.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any


def _get_matplotlib():
    """Lazy import matplotlib to avoid startup cost."""
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
        return plt
    except ImportError:
        return None


def generate_feature_importance_chart(
    features: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Feature Importance",
    max_features: int = 10,
    color: str = "#4F46E5",
) -> dict[str, Any]:
    """
    Generate a horizontal bar chart showing feature importance.

    Args:
        features: List of dicts with 'feature' and 'importance' keys
        output_path: Where to save the chart (PNG or SVG)
        title: Chart title
        max_features: Maximum number of features to show
        color: Bar color (hex or name)

    Returns:
        dict with 'success', 'path', 'error' keys
    """
    plt = _get_matplotlib()
    if plt is None:
        return {"success": False, "error": "matplotlib not installed"}

    if not features:
        return {"success": False, "error": "No features provided"}

    try:
        # Extract data
        top_features = features[:max_features]
        names = [f.get("feature", "Unknown") for f in reversed(top_features)]
        values = [f.get("importance", 0) for f in reversed(top_features)]

        # Create figure
        fig, ax = plt.subplots(figsize=(8, max(4, len(names) * 0.4)))

        # Create horizontal bar chart
        bars = ax.barh(names, values, color=color, edgecolor="white", linewidth=0.5)

        # Add value labels
        for bar, val in zip(bars, values):
            width = bar.get_width()
            ax.text(
                width + max(values) * 0.02,
                bar.get_y() + bar.get_height() / 2,
                f"{val:.1f}",
                va="center",
                ha="left",
                fontsize=9,
                color="#374151",
            )

        # Style
        ax.set_xlabel("Importance Score", fontsize=10, color="#374151")
        ax.set_title(title, fontsize=12, fontweight="bold", color="#111827", pad=15)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color("#E5E7EB")
        ax.spines["bottom"].set_color("#E5E7EB")
        ax.tick_params(colors="#374151", labelsize=9)
        ax.set_xlim(0, max(values) * 1.15)

        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return {"success": True, "path": str(output_path)}

    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_segment_pie_chart(
    segments: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Customer Segments",
    colors: list[str] | None = None,
) -> dict[str, Any]:
    """
    Generate a pie chart showing segment distribution.

    Args:
        segments: List of dicts with 'name' and 'size' keys
        output_path: Where to save the chart (PNG or SVG)
        title: Chart title
        colors: Custom color palette (optional)

    Returns:
        dict with 'success', 'path', 'error' keys
    """
    plt = _get_matplotlib()
    if plt is None:
        return {"success": False, "error": "matplotlib not installed"}

    if not segments:
        return {"success": False, "error": "No segments provided"}

    try:
        # Default color palette
        if colors is None:
            colors = [
                "#4F46E5",  # Indigo
                "#10B981",  # Emerald
                "#F59E0B",  # Amber
                "#EF4444",  # Red
                "#8B5CF6",  # Violet
                "#06B6D4",  # Cyan
                "#F97316",  # Orange
                "#EC4899",  # Pink
            ]

        # Extract data
        names = [s.get("name", f"Segment {i}") for i, s in enumerate(segments)]
        sizes = [s.get("size", s.get("persona_size", 0)) for s in segments]
        total = sum(sizes)

        if total == 0:
            return {"success": False, "error": "Total segment size is zero"}

        # Extend colors if needed
        while len(colors) < len(segments):
            colors = colors + colors
        colors = colors[:len(segments)]

        # Create figure
        fig, ax = plt.subplots(figsize=(8, 6))

        # Create pie chart with percentages
        def autopct_func(pct):
            return f"{pct:.1f}%" if pct > 5 else ""

        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=None,  # We'll add a legend instead
            autopct=autopct_func,
            colors=colors,
            startangle=90,
            explode=[0.02] * len(segments),
            shadow=False,
            wedgeprops={"edgecolor": "white", "linewidth": 2},
        )

        # Style autotexts
        for autotext in autotexts:
            autotext.set_color("white")
            autotext.set_fontsize(10)
            autotext.set_fontweight("bold")

        # Add legend
        legend_labels = [f"{name} ({size:,})" for name, size in zip(names, sizes)]
        ax.legend(
            wedges,
            legend_labels,
            title="Segments",
            loc="center left",
            bbox_to_anchor=(1, 0, 0.5, 1),
            fontsize=9,
        )

        ax.set_title(title, fontsize=12, fontweight="bold", color="#111827", pad=10)

        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return {"success": True, "path": str(output_path)}

    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_correlation_chart(
    correlations: list[dict[str, Any]],
    output_path: str | Path,
    title: str = "Top Feature Correlations",
    max_pairs: int = 10,
) -> dict[str, Any]:
    """
    Generate a bar chart showing correlation strengths.

    Args:
        correlations: List of dicts with 'feature1', 'feature2', 'pearson' keys
        output_path: Where to save the chart (PNG or SVG)
        title: Chart title
        max_pairs: Maximum number of correlation pairs to show

    Returns:
        dict with 'success', 'path', 'error' keys
    """
    plt = _get_matplotlib()
    if plt is None:
        return {"success": False, "error": "matplotlib not installed"}

    if not correlations:
        return {"success": False, "error": "No correlations provided"}

    try:
        # Extract data (reverse for horizontal bar chart)
        top_corrs = correlations[:max_pairs]
        labels = [
            f"{c.get('feature1', 'X')} vs {c.get('feature2', 'Y')}"
            for c in reversed(top_corrs)
        ]
        values = [c.get("pearson", 0) for c in reversed(top_corrs)]

        # Color by direction
        colors = ["#10B981" if v >= 0 else "#EF4444" for v in values]

        # Create figure
        fig, ax = plt.subplots(figsize=(10, max(4, len(labels) * 0.4)))

        # Create horizontal bar chart
        bars = ax.barh(labels, values, color=colors, edgecolor="white", linewidth=0.5)

        # Add value labels
        for bar, val in zip(bars, values):
            width = bar.get_width()
            offset = 0.02 if val >= 0 else -0.02
            ha = "left" if val >= 0 else "right"
            ax.text(
                width + offset,
                bar.get_y() + bar.get_height() / 2,
                f"{val:.3f}",
                va="center",
                ha=ha,
                fontsize=9,
                color="#374151",
            )

        # Style
        ax.set_xlabel("Pearson Correlation", fontsize=10, color="#374151")
        ax.set_title(title, fontsize=12, fontweight="bold", color="#111827", pad=15)
        ax.axvline(x=0, color="#9CA3AF", linewidth=0.5)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color("#E5E7EB")
        ax.spines["bottom"].set_color("#E5E7EB")
        ax.tick_params(colors="#374151", labelsize=9)

        # Set x-axis limits
        max_abs = max(abs(v) for v in values) if values else 1
        ax.set_xlim(-max_abs * 1.2, max_abs * 1.2)

        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return {"success": True, "path": str(output_path)}

    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_model_performance_chart(
    metrics: dict[str, Any],
    baseline_metrics: dict[str, Any] | None = None,
    output_path: str | Path = "",
    title: str = "Model Performance",
) -> dict[str, Any]:
    """
    Generate a bar chart comparing model performance to baseline.

    Args:
        metrics: Dict with metric names as keys, values as values
        baseline_metrics: Optional baseline metrics for comparison
        output_path: Where to save the chart (PNG or SVG)
        title: Chart title

    Returns:
        dict with 'success', 'path', 'error' keys
    """
    plt = _get_matplotlib()
    if plt is None:
        return {"success": False, "error": "matplotlib not installed"}

    if not metrics:
        return {"success": False, "error": "No metrics provided"}

    try:
        import numpy as np

        # Filter to common metrics
        display_names = {
            "accuracy": "Accuracy",
            "r2": "R-Squared",
            "rmse": "RMSE",
            "mae": "MAE",
            "f1": "F1 Score",
            "precision": "Precision",
            "recall": "Recall",
        }

        # Get metrics that have both model and baseline values
        metric_keys = [k for k in metrics.keys() if k in display_names]
        if not metric_keys:
            return {"success": False, "error": "No displayable metrics found"}

        labels = [display_names[k] for k in metric_keys]
        model_values = [float(metrics.get(k, 0)) for k in metric_keys]

        has_baseline = baseline_metrics and any(k in baseline_metrics for k in metric_keys)
        baseline_values = [
            float(baseline_metrics.get(k, 0)) if baseline_metrics else 0
            for k in metric_keys
        ]

        # Create figure
        fig, ax = plt.subplots(figsize=(8, 5))

        x = np.arange(len(labels))
        width = 0.35 if has_baseline else 0.6

        # Create bars
        bars1 = ax.bar(
            x - width / 2 if has_baseline else x,
            model_values,
            width,
            label="Model",
            color="#4F46E5",
            edgecolor="white",
        )

        if has_baseline:
            bars2 = ax.bar(
                x + width / 2,
                baseline_values,
                width,
                label="Baseline",
                color="#9CA3AF",
                edgecolor="white",
            )

        # Add value labels
        for bar in bars1:
            height = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                height,
                f"{height:.2f}",
                ha="center",
                va="bottom",
                fontsize=9,
                color="#374151",
            )

        if has_baseline:
            for bar in bars2:
                height = bar.get_height()
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    height,
                    f"{height:.2f}",
                    ha="center",
                    va="bottom",
                    fontsize=9,
                    color="#374151",
                )

        # Style
        ax.set_ylabel("Score", fontsize=10, color="#374151")
        ax.set_title(title, fontsize=12, fontweight="bold", color="#111827", pad=15)
        ax.set_xticks(x)
        ax.set_xticklabels(labels, fontsize=9)
        ax.legend(loc="upper right")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color("#E5E7EB")
        ax.spines["bottom"].set_color("#E5E7EB")
        ax.tick_params(colors="#374151")

        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches="tight", facecolor="white")
        plt.close(fig)

        return {"success": True, "path": str(output_path)}

    except Exception as e:
        return {"success": False, "error": str(e)}


class ChartGenerator:
    """
    Convenience wrapper for generating charts during report creation.
    Handles output paths and provides relative markdown references.
    """

    def __init__(self, artifacts_dir: str | Path):
        self.artifacts_dir = Path(artifacts_dir)
        self.charts_dir = self.artifacts_dir / "charts"
        self.charts_dir.mkdir(parents=True, exist_ok=True)
        self.generated: list[dict[str, Any]] = []

    def feature_importance(
        self,
        features: list[dict[str, Any]],
        filename: str = "feature_importance.png",
        **kwargs,
    ) -> str | None:
        """Generate feature importance chart and return markdown image reference."""
        path = self.charts_dir / filename
        result = generate_feature_importance_chart(features, path, **kwargs)

        if result.get("success"):
            self.generated.append({"type": "feature_importance", "path": str(path)})
            # Return relative path for markdown
            return f"![Feature Importance](charts/{filename})"
        return None

    def segment_pie(
        self,
        segments: list[dict[str, Any]],
        filename: str = "segments.png",
        **kwargs,
    ) -> str | None:
        """Generate segment pie chart and return markdown image reference."""
        path = self.charts_dir / filename
        result = generate_segment_pie_chart(segments, path, **kwargs)

        if result.get("success"):
            self.generated.append({"type": "segment_pie", "path": str(path)})
            return f"![Customer Segments](charts/{filename})"
        return None

    def correlations(
        self,
        correlations: list[dict[str, Any]],
        filename: str = "correlations.png",
        **kwargs,
    ) -> str | None:
        """Generate correlation chart and return markdown image reference."""
        path = self.charts_dir / filename
        result = generate_correlation_chart(correlations, path, **kwargs)

        if result.get("success"):
            self.generated.append({"type": "correlations", "path": str(path)})
            return f"![Top Correlations](charts/{filename})"
        return None

    def model_performance(
        self,
        metrics: dict[str, Any],
        baseline_metrics: dict[str, Any] | None = None,
        filename: str = "model_performance.png",
        **kwargs,
    ) -> str | None:
        """Generate model performance chart and return markdown image reference."""
        path = self.charts_dir / filename
        result = generate_model_performance_chart(metrics, baseline_metrics, path, **kwargs)

        if result.get("success"):
            self.generated.append({"type": "model_performance", "path": str(path)})
            return f"![Model Performance](charts/{filename})"
        return None

    def get_generated_charts(self) -> list[dict[str, Any]]:
        """Return list of all generated charts with metadata."""
        return self.generated.copy()
