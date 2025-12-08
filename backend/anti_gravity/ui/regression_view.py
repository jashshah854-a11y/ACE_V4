
import pandas as pd
import streamlit as st
import altair as alt
from typing import Dict, Optional
from backend.anti_gravity.utils.presets import MODEL_PRESETS

def render_modeling_controls(preview_df: pd.DataFrame) -> None:
    if preview_df is None or preview_df.empty:
        return
    config = st.session_state.get("modeling_config", {}).copy()
    columns = preview_df.columns.tolist()
    numeric_cols = preview_df.select_dtypes(include="number").columns.tolist()
    st.markdown("### Modeling Controls")
    st.caption("Tune the regression agent before launching your run.")

    preset_cols = st.columns(len(MODEL_PRESETS) + 1)
    for (label, preset_values), col in zip(MODEL_PRESETS.items(), preset_cols[:-1]):
        if col.button(label, key=f"preset-btn-{label}"):
            st.session_state["modeling_config"] = preset_values.copy()
            st.rerun()
    if preset_cols[-1].button("Reset to defaults", key="preset-reset"):
        st.session_state["modeling_config"] = {}
        st.rerun()

    options = ["Auto (ACE decides)"] + numeric_cols
    target_value = config.get("target_column")
    target_index = 0
    if target_value and target_value in numeric_cols:
        target_index = options.index(target_value)
    choice = st.selectbox(
        "Primary metric to predict",
        options,
        index=target_index,
        help="Pick a target KPI or let ACE pick automatically.",
    )
    target = None if choice == "Auto (ACE decides)" else choice

    feature_default = config.get("feature_whitelist") or []
    features = st.multiselect(
        "Feature emphasis",
        options=columns,
        default=[f for f in feature_default if f in columns],
        help="Optionally limit modeling to specific columns.",
    )

    include_cats = st.checkbox(
        "Encode categorical columns",
        value=bool(config.get("include_categoricals", False)),
    )
    fast_mode = st.checkbox(
        "Fast mode (smaller sample)",
        value=bool(config.get("fast_mode", False)),
    )
    model_options = {
        "Random Forest (default)": "random_forest",
        "Gradient Boosting": "gradient_boosting",
        "Linear Regression": "linear",
    }
    current_model = config.get("model_type", "random_forest")
    model_label = next((label for label, key in model_options.items() if key == current_model), "Random Forest (default)")
    labels = list(model_options.keys())
    selected_model_label = st.selectbox("Model family", labels, index=labels.index(model_label))
    model_choice = model_options[selected_model_label]

    st.session_state["modeling_config"] = {
        "target_column": target,
        "feature_whitelist": features,
        "include_categoricals": include_cats,
        "fast_mode": fast_mode,
        "model_type": model_choice,
    }
    summary = []
    if target:
        summary.append(f"Target: `{target}`")
    if features:
        summary.append(f"Focus: {len(features)} features")
    if include_cats:
        summary.append("Categoricals on")
    if fast_mode:
        summary.append("Fast mode")
    st.caption(" • ".join(summary) if summary else "ACE will auto-select the best target and features.")

def render_regression_tab(regression: Optional[Dict]):
    if not regression:
        st.info("Regression modeling output is not available yet.")
        return

    status = regression.get("status")
    if status != "ok":
        reason = regression.get("reason") or "Regression agent skipped due to missing signal."
        st.warning(f"Regression agent status: {status}. {reason}")
        with st.expander("View regression payload"):
            st.json(regression)
        return

    target = regression.get("target_column", "target")
    metrics = regression.get("metrics") or {}
    model_kind = regression.get("model", "random_forest").replace('_', ' ').title()

    ribbon = st.columns([3, 1])
    with ribbon[0]:
        st.markdown(f"### Modeling `{target}`")
        if regression.get("narrative"):
            st.info(regression["narrative"])
    with ribbon[1]:
        st.caption("Model type")
        st.write(f"`{model_kind}`")

    metric_cols = st.columns(3)
    r2 = metrics.get("r2")
    metric_cols[0].metric("R^2", f"{r2:.2f}" if r2 is not None else "-")
    rmse = metrics.get("rmse")
    metric_cols[1].metric("RMSE", f"{rmse:.2f}" if rmse is not None else "-")
    mae = metrics.get("mae")
    metric_cols[2].metric("MAE", f"{mae:.2f}" if mae is not None else "-")

    drivers = regression.get("drivers") or []
    if drivers:
        st.markdown("#### Top Predictive Drivers")
        driver_df = pd.DataFrame(drivers)
        chart = (
            alt.Chart(driver_df)
            .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
            .encode(
                x=alt.X("importance", title="Importance"),
                y=alt.Y("feature", sort='-x', title="Feature"),
                tooltip=["feature", alt.Tooltip("importance", format=".3f")],
            )
            .properties(height=280)
        )
        st.altair_chart(chart, use_container_width=True)
        st.dataframe(driver_df, use_container_width=True)
    else:
        st.caption("Driver importances are not available for this model.")

    predictions = regression.get("predictions") or []
    if predictions:
        st.markdown("#### Prediction Sample & Residuals")
        preview_df = pd.DataFrame(predictions)
        preview_df["abs_error"] = preview_df["error"].abs()
        scatter = (
            alt.Chart(preview_df)
            .mark_circle(size=70, opacity=0.7)
            .encode(
                x=alt.X("actual", title="Actual"),
                y=alt.Y("predicted", title="Predicted"),
                color=alt.Color("abs_error", title="|Error|", scale=alt.Scale(scheme="plasma")),
                tooltip=[
                    alt.Tooltip("actual", format=".2f"),
                    alt.Tooltip("predicted", format=".2f"),
                    alt.Tooltip("error", format=".2f"),
                ],
            )
            .properties(height=260)
        )
        st.altair_chart(scatter, use_container_width=True)

        hist = (
            alt.Chart(preview_df)
            .mark_bar()
            .encode(
                x=alt.X("error", bin=alt.Bin(maxbins=30), title="Prediction error"),
                y=alt.Y('count()', title='Records'),
            )
            .properties(height=200)
        )
        st.altair_chart(hist, use_container_width=True)

        worst_rows = preview_df.sort_values("abs_error", ascending=False).head(5)
        st.markdown("#### Largest Residuals")
        st.dataframe(worst_rows, use_container_width=True)
    else:
        st.caption("Prediction samples were not available.")

    config_blob = regression.get("input_config") or {}
    if config_blob:
        readable = [f"{k}={v}" for k, v in config_blob.items() if v not in (None, "")]
        if readable:
            st.caption("Model configuration: " + ", ".join(readable))

    with st.expander("View regression payload"):
        st.json(regression)
