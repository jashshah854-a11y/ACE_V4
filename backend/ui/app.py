import io
import os
from typing import Dict, Optional

import pandas as pd
import requests
import streamlit as st
import altair as alt

import sys
from pathlib import Path as _Path
ROOT_DIR = _Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from core.pipeline_map import PIPELINE_SEQUENCE, PIPELINE_DESCRIPTIONS

st.set_page_config(page_title="ACE V3 Analytics Engine", layout="wide", page_icon="??")

st.title("ACE V3 Universal Analytics Workbench")
st.caption("Upload data, launch the multi-agent pipeline, and watch each step assemble a consultant-grade report.")

REQUEST_TIMEOUT = 30
RUN_COMPLETE_STATUSES = {"complete", "complete_with_errors", "failed"}
ARTIFACT_ENDPOINTS = {
    "schema": "schema_map",
    "overseer": "overseer_output",
    "personas": "personas",
    "strategies": "strategies",
    "anomalies": "anomalies",
}
STATUS_EMOJI = {
    "pending": "⚪ Pending",
    "running": "🟡 Running",
    "completed": "🟢 Completed",
    "failed": "🔴 Failed",
}


def format_big_number(value):
    if value is None:
        return "-"
    try:
        value = float(value)
    except (TypeError, ValueError):
        return str(value)
    if value >= 1_000_000:
        return f"{value/1_000_000:.1f}M"
    if value >= 1_000:
        return f"{value/1_000:.1f}K"
    if value.is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"


def clean_role_name(name: str) -> str:
    return name.replace("_like", " ").replace("_", " ").title()


def role_counts_from_schema(schema: Dict) -> Dict[str, int]:
    counts = {}
    for role, columns in (schema.get("semantic_roles") or {}).items():
        if columns:
            counts[clean_role_name(role)] = len(columns)
    return counts


def chunk_list(items, chunk_size=2):
    for i in range(0, len(items), chunk_size):
        yield items[i : i + chunk_size]


def extract_persona_list(personas) -> list:
    if isinstance(personas, dict):
        entries = personas.get("personas")
        if isinstance(entries, list):
            return entries
        return [personas]
    if isinstance(personas, list):
        return personas
    return []


def render_schema_tab(schema: Optional[Dict]):
    if not schema:
        st.warning("No schema map was generated for this run.")
        return

    dataset_info = schema.get("dataset_info", {})
    stats = schema.get("stats", {})
    basic_types = schema.get("basic_types", {})
    domain_guess = schema.get("domain_guess", {})
    roles = role_counts_from_schema(schema)

    kpi_cols = st.columns(4)
    kpi_cols[0].metric("Columns", format_big_number(dataset_info.get("column_count")))
    kpi_cols[1].metric("Rows", format_big_number(dataset_info.get("row_count")))
    kpi_cols[2].metric("Detected Domain", domain_guess.get("domain", "-"))
    total_roles = len(schema.get("semantic_roles", {}))
    detected_roles = len(roles)
    role_value = f"{detected_roles}/{total_roles}" if total_roles else "0"
    kpi_cols[3].metric("Semantic Roles", role_value)

    st.markdown("#### Column Type Mix")
    type_counts = {key.title(): len(values or []) for key, values in basic_types.items() if values}
    if type_counts:
        type_df = pd.DataFrame({"Type": list(type_counts.keys()), "Columns": list(type_counts.values())})
        st.bar_chart(type_df.set_index("Type"))
    else:
        st.caption("No column type information available.")

    if roles:
        st.markdown("#### Semantic Coverage")
        role_df = pd.DataFrame({"Role": list(roles.keys()), "Columns": list(roles.values())})
        chart = (
            alt.Chart(role_df)
            .mark_bar(color="#6C63FF")
            .encode(y=alt.Y("Role", sort='-x'), x="Columns")
        )
        st.altair_chart(chart, use_container_width=True)

    if stats:
        st.markdown("#### Column Health Snapshot")
        stats_df = pd.DataFrame(stats).T.reset_index().rename(columns={"index": "column"})
        preview_cols = ["column", "mean", "median", "min", "max", "missing_rate"]
        available_cols = [col for col in preview_cols if col in stats_df.columns]
        if available_cols:
            st.dataframe(stats_df[available_cols].round(2), use_container_width=True)

    samples = dataset_info.get("sample_rows")
    if samples:
        st.markdown("#### Sample Rows")
        st.dataframe(pd.DataFrame(samples).head(5), use_container_width=True)

    with st.expander("View raw schema JSON"):
        st.json(schema)


def build_cluster_records(overseer: Dict) -> pd.DataFrame:
    fingerprints = overseer.get("fingerprints") or {}
    rows = []
    for key, fingerprint in fingerprints.items():
        cluster_id = fingerprint.get("cluster_id", key)
        size = fingerprint.get("size")
        role_summaries = fingerprint.get("role_summaries") or {}
        if role_summaries:
            dominant_role, dominant_value = max(role_summaries.items(), key=lambda item: item[1])
            dominant_role = clean_role_name(dominant_role)
        else:
            dominant_role, dominant_value = ("-", 0)
        rows.append(
            {
                "Cluster": f"Cluster {cluster_id}",
                "size": size,
                "Dominant Role": dominant_role,
                "Dominant Score": dominant_value,
                "role_summaries": role_summaries,
                "feature_means": fingerprint.get("feature_means") or {},
            }
        )
    return pd.DataFrame(rows)


def render_clusters_tab(overseer: Optional[Dict]):
    if not overseer:
        st.warning("No clustering output available.")
        return

    stats = overseer.get("stats", {})
    cluster_df = build_cluster_records(overseer)
    sizes = stats.get("sizes") or cluster_df.get("size", pd.Series(dtype=float)).tolist()

    total_customers = sum(sizes) if sizes else None
    largest = max(sizes) if sizes else None

    kpi_cols = st.columns(4)
    kpi_cols[0].metric("Clusters", stats.get("k", len(cluster_df)))
    silhouette = stats.get("silhouette")
    kpi_cols[1].metric("Silhouette", f"{silhouette:.2f}" if silhouette is not None else "-")
    kpi_cols[2].metric("Largest Cluster", format_big_number(largest))
    kpi_cols[3].metric("Total Profiles", format_big_number(total_customers))

    if not cluster_df.empty:
        st.markdown("#### Cluster Sizes")
        chart_df = cluster_df.set_index("Cluster")["size"].to_frame("Customers")
        st.bar_chart(chart_df)

        st.markdown("#### Cluster Highlights")
        display_cols = ["Cluster", "size", "Dominant Role"]
        st.dataframe(cluster_df[display_cols].rename(columns={"size": "Customers"}), use_container_width=True)

        role_records = []
        for _, row in cluster_df.iterrows():
            for role_name, value in (row.get("role_summaries") or {}).items():
                role_records.append(
                    {
                        "Cluster": row["Cluster"],
                        "Role": clean_role_name(role_name),
                        "Value": value,
                    }
                )
        if role_records:
            role_df = pd.DataFrame(role_records)
            st.markdown("#### Semantic Fingerprints")
            role_chart = (
                alt.Chart(role_df)
                .mark_bar()
                .encode(
                    y=alt.Y("Role", sort='-x'),
                    x="Value",
                    color="Cluster",
                    tooltip=["Cluster", "Role", alt.Tooltip("Value", format=".2f")],
                )
                .properties(height=300)
            )
            st.altair_chart(role_chart, use_container_width=True)

    with st.expander("View raw clustering JSON"):
        st.json(overseer)


def render_personas_tab(personas):
    persona_list = extract_persona_list(personas)
    if not persona_list:
        st.info("No personas generated.")
        return

    st.markdown("#### Persona Gallery")
    for row in chunk_list(persona_list, 2):
        cols = st.columns(len(row))
        for col, persona in zip(cols, row):
            with col:
                container = st.container()
                with container:
                    title = persona.get("name") or "Persona"
                    st.markdown(f"**{title}**")
                    st.caption(persona.get("label", ""))

                    metrics = st.columns(3)
                    snapshot = persona.get("snapshot") or {}
                    metrics[0].metric("Income", snapshot.get("income_level", "-"))
                    metrics[1].metric("Spend", snapshot.get("spend_level", "-"))
                    metrics[2].metric("Risk", snapshot.get("risk_score", "-"))

                    if persona.get("persona_size"):
                        st.caption(f"Segment size: {format_big_number(persona['persona_size'])}")

                    for heading, body in [
                        ("Behavior", persona.get("behavior")),
                        ("Motivation", persona.get("motivation")),
                        ("Opportunity", persona.get("opportunity_zone")),
                        ("Action", persona.get("action")),
                    ]:
                        if body:
                            st.markdown(f"**{heading}:** {body}")

                    if persona.get("emotional_state"):
                        st.info(f"Emotional state: {persona['emotional_state']}")

                    with st.expander("Persona details"):
                        st.json(persona)


def render_strategies_tab(strategies):
    if isinstance(strategies, dict):
        strategy_list = strategies.get("strategies", [])
    elif isinstance(strategies, list):
        strategy_list = strategies
    else:
        strategy_list = []

    if not strategy_list:
        st.info("No strategic recommendations available.")
        return

    st.markdown("#### Plays by Persona")
    summary_rows = []
    for strategy in strategy_list:
        summary_rows.append({
            "Persona": strategy.get("persona_name", "Unknown"),
            "Play": (strategy.get("play_type") or "-").replace("_", " " ).title(),
            "Headline": strategy.get("headline", ""),
            "Tactics": "; ".join(strategy.get("tactics", [])),
        })
    st.dataframe(pd.DataFrame(summary_rows), use_container_width=True)

    for strategy in strategy_list:
        label = f"{strategy.get('persona_name', 'Persona')} - {(strategy.get('play_type') or '-').replace('_', ' ').title()}"
        with st.expander(label):
            st.markdown(f"**Headline:** {strategy.get('headline', 'N/A')}")
            tactics = strategy.get("tactics") or []
            if tactics:
                st.markdown("**Tactics:**")
                st.markdown("\n".join(f"- {t}" for t in tactics))
            st.json(strategy)


def render_anomalies_tab(anomalies):
    if not anomalies or not isinstance(anomalies, dict):
        st.info("ACE did not detect notable anomalies.")
        return

    if anomalies.get("status") == "error":
        st.error(f"Anomaly engine reported an error: {anomalies.get('reason', 'Unknown')}")
        return

    count = anomalies.get("anomaly_count", 0)
    drivers = anomalies.get("drivers") or {}
    role_deviations = anomalies.get("role_deviations") or {}

    kpi_cols = st.columns(3)
    kpi_cols[0].metric("Total Anomalies", format_big_number(count))
    kpi_cols[1].metric("Drivers", len(drivers))
    kpi_cols[2].metric("Role Deviations", len(role_deviations))

    if drivers:
        st.markdown("#### Top Drivers")
        driver_df = pd.DataFrame({"Feature": list(drivers.keys()), "Importance": list(drivers.values())}).sort_values("Importance", ascending=False)
        driver_chart = alt.Chart(driver_df).mark_bar(color="#FF6B6B").encode(y=alt.Y("Feature", sort='-x'), x="Importance")
        st.altair_chart(driver_chart, use_container_width=True)

    if role_deviations:
        st.markdown("#### Role Deviations")
        role_df = pd.DataFrame({"Role": [clean_role_name(k) for k in role_deviations.keys()], "Deviation": list(role_deviations.values())}).sort_values("Deviation", ascending=False)
        role_chart = alt.Chart(role_df).mark_bar(color="#FFA600").encode(y=alt.Y("Role", sort='-x'), x="Deviation")
        st.altair_chart(role_chart, use_container_width=True)

    records = anomalies.get("anomalies") or []
    if records:
        st.markdown("#### Sample Anomalous Records")
        st.dataframe(pd.DataFrame(records).head(50), use_container_width=True)

    with st.expander("View raw anomaly JSON"):
        st.json(anomalies)



def extract_report_summary(text: str) -> list:
    if not text:
        return []
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    bullets = [line.lstrip('-* ') for line in lines if line[0] in "-*"]
    if bullets:
        return bullets[:3]
    return lines[:3]



def render_final_report_tab(final_report: Optional[str]):
    if not final_report:
        st.warning("Final report not found for this run.")
        return

    summary = extract_report_summary(final_report)
    if summary:
        st.markdown("#### Executive Highlights")
        for item in summary:
            st.write(f"- {item}")

    st.markdown("#### Full Report")
    st.markdown(final_report)
    st.download_button(
        "Download final_report.md",
        data=final_report,
        file_name="final_report.md",
        mime="text/markdown",
        use_container_width=True,
    )

def resolve_api_base() -> str:
    base = os.environ.get("ACE_API_BASE_URL")
    if base:
        return base.rstrip("/")
    secret_base = None
    try:
        secret_base = st.secrets["ACE_API_BASE_URL"]
    except Exception:
        secret_base = None
    return (secret_base or "http://localhost:8000").rstrip("/")


def api_url(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return f"{API_BASE_URL}{path}"


def trigger_remote_run(file_name: str, file_bytes: bytes) -> Dict:
    files = {"file": (file_name or "uploaded.csv", file_bytes, "text/csv")}
    resp = requests.post(api_url("/run"), files=files, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def fetch_run_state(run_id: str) -> Optional[Dict]:
    resp = requests.get(api_url(f"/runs/{run_id}/state"), timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def fetch_artifact(run_id: str, artifact: str) -> Optional[Dict]:
    resp = requests.get(api_url(f"/runs/{run_id}/artifacts/{artifact}"), timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def fetch_final_report(run_id: str) -> Optional[str]:
    resp = requests.get(api_url(f"/runs/{run_id}/report"), timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.text


def load_artifacts(run_id: str) -> Dict:
    artifacts = {}
    for alias, name in ARTIFACT_ENDPOINTS.items():
        try:
            data = fetch_artifact(run_id, name)
        except requests.RequestException as exc:
            st.warning(f"Failed to load {alias}: {exc}")
            data = None
        if data is not None:
            artifacts[alias] = data
    try:
        report = fetch_final_report(run_id)
    except requests.RequestException as exc:
        st.warning(f"Failed to load final report: {exc}")
        report = None
    if report:
        artifacts["final_report"] = report
    return artifacts


API_BASE_URL = resolve_api_base()

if "data_profile" not in st.session_state:
    st.session_state.data_profile = None
if "run_id" not in st.session_state:
    st.session_state.run_id = None
if "pipeline_state" not in st.session_state:
    st.session_state.pipeline_state = None
if "pipeline_artifacts" not in st.session_state:
    st.session_state.pipeline_artifacts = {}
if "artifacts_run_id" not in st.session_state:
    st.session_state.artifacts_run_id = None

with st.container():
    st.markdown(
        """
        **Pipeline Overview**
        1. Upload any CSV with behavioral, transactional, or customer data.
        2. ACE uploads the file to the backend and launches Scanner ➜ Expositor asynchronously.
        3. Watch progress, inspect intermediate artifacts, and download the final Markdown report.
        """
    )

uploaded_file = st.file_uploader(
    "Drag & drop your CSV", type=["csv"], help="ACE only needs a single CSV. Join tables beforehand if needed."
)

file_bytes = None
preview_df = None

if uploaded_file:
    file_bytes = uploaded_file.getvalue()
    try:
        preview_df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception:
        preview_df = None
        st.warning("Uploaded file detected, but Streamlit could not preview it. The ACE engine can still run.")

    if preview_df is not None:
        rows, cols = preview_df.shape
        missing_pct = (preview_df.isna().sum().sum() / (rows * cols) * 100) if rows and cols else 0
        st.session_state.data_profile = {
            "rows": rows,
            "cols": cols,
            "missing_pct": round(missing_pct, 2)
        }
        st.subheader("Quick Dataset Glance")
        metrics = st.columns(3)
        metrics[0].metric("Rows", f"{rows:,}")
        metrics[1].metric("Columns", f"{cols:,}")
        metrics[2].metric("Missing %", f"{st.session_state.data_profile['missing_pct']}%")
        st.dataframe(preview_df.head(100), use_container_width=True)
    else:
        st.session_state.data_profile = None

    st.info("Ready! Click below to hand the dataset to the ACE backend.")
    run_clicked = st.button("?? Launch ACE Pipeline", use_container_width=True)

    if run_clicked and file_bytes:
        with st.spinner("Uploading file and initializing ACE orchestrator..."):
            try:
                response = trigger_remote_run(uploaded_file.name, file_bytes)
            except requests.RequestException as exc:
                st.error(f"Failed to start ACE run: {exc}")
                response = None
        if response:
            st.success(f"Run accepted! ID: {response['run_id']}")
            st.session_state.run_id = response["run_id"]
            st.session_state.pipeline_state = None
            st.session_state.pipeline_artifacts = {}
            st.session_state.artifacts_run_id = None
            st.session_state["existing_run_id"] = response["run_id"]

st.divider()
st.subheader("Pipeline Monitor")

existing_run_input = st.text_input(
    "Enter an existing Run ID to inspect",
    value=st.session_state.get("existing_run_id", ""),
    key="existing_run_id"
)
load_run_col1, load_run_col2 = st.columns([1, 3])
with load_run_col1:
    if st.button("Load Run", use_container_width=True):
        if existing_run_input.strip():
            st.session_state.run_id = existing_run_input.strip()
            st.session_state.pipeline_state = None
            st.session_state.pipeline_artifacts = {}
            st.session_state.artifacts_run_id = None
with load_run_col2:
    if st.session_state.run_id:
        st.info(f"Tracking Run ID: {st.session_state.run_id}")
    else:
        st.info("Upload a dataset or enter a Run ID to begin monitoring.")

pipeline_state = None
if st.session_state.run_id:
    try:
        pipeline_state = fetch_run_state(st.session_state.run_id)
    except requests.RequestException as exc:
        st.error(f"Unable to fetch run state: {exc}")

if pipeline_state:
    st.session_state.pipeline_state = pipeline_state

if st.session_state.pipeline_state:
    state = st.session_state.pipeline_state
    status = state.get("status", "pending")
    steps = state.get("steps", {})
    completed = len([s for s in steps.values() if s.get("status") == "completed"])
    total_steps = len(PIPELINE_SEQUENCE)
    st.progress(completed / total_steps if total_steps else 0)

    st.markdown(f"**Run Status:** {status}")
    if state.get("history"):
        st.caption("Most recent event: {}".format(state["history"][-1]["event"]))

    timeline = st.container()
    with timeline:
        st.subheader("Agent Timeline")
        for step in PIPELINE_SEQUENCE:
            step_state = steps.get(step, {})
            emoji = STATUS_EMOJI.get(step_state.get("status", "pending"), "⚪ Pending")
            label = f"{emoji} {step.title()}"
            description = PIPELINE_DESCRIPTIONS.get(step, step)
            with st.expander(label, expanded=step_state.get("status") == "running"):
                st.caption(description)
                st.write(f"Status: {step_state.get('status', 'pending')}")
                if step_state.get("started_at"):
                    st.write(f"Started: {step_state['started_at']}")
                if step_state.get("completed_at"):
                    st.write(f"Completed: {step_state['completed_at']}")
                if step_state.get("runtime_seconds"):
                    st.write(f"Runtime: {step_state['runtime_seconds']}s")
                if step_state.get("stdout_tail"):
                    st.code(step_state["stdout_tail"], language="bash")
                if step_state.get("stderr_tail"):
                    st.error(step_state["stderr_tail"])

    if status in RUN_COMPLETE_STATUSES:
        if st.session_state.artifacts_run_id != st.session_state.run_id:
            st.info("Loading artifacts and final report...")
            artifacts = load_artifacts(st.session_state.run_id)
            st.session_state.pipeline_artifacts = artifacts
            st.session_state.artifacts_run_id = st.session_state.run_id
        artifacts = st.session_state.pipeline_artifacts
        schema = artifacts.get("schema")
        overseer = artifacts.get("overseer")
        personas = artifacts.get("personas")
        strategies = artifacts.get("strategies")
        anomalies = artifacts.get("anomalies")
        final_report = artifacts.get("final_report")

        tabs = st.tabs([
            "Overview", "Schema", "Clusters", "Personas", "Strategies", "Anomalies", "Final Report"
        ])

        with tabs[0]:
            st.subheader("Run Summary")
            col1, col2, col3 = st.columns(3)
            profile = st.session_state.data_profile or {}
            col1.metric("Rows", f"{profile.get('rows', '-')}")
            col2.metric("Columns", f"{profile.get('cols', '-')}")
            col3.metric("Missing %", f"{profile.get('missing_pct', '-')}")
            st.caption(f"Run ID: {st.session_state.run_id}")

            if state.get("history"):
                st.markdown("**Event History**")
                history_df = pd.DataFrame(state["history"])
                st.dataframe(history_df.tail(20), use_container_width=True)

        with tabs[1]:
            st.subheader("Schema Intelligence")
            render_schema_tab(schema)

        with tabs[2]:
            st.subheader("Clusters & Fingerprints")
            render_clusters_tab(overseer)

        with tabs[3]:
            st.subheader("Personas")
            render_personas_tab(personas)

        with tabs[4]:
            st.subheader("Strategies")
            render_strategies_tab(strategies)

        with tabs[5]:
            st.subheader("Anomalies")
            render_anomalies_tab(anomalies)

        with tabs[6]:
            st.subheader("Final Report")
            render_final_report_tab(final_report)
    else:
        st.info("Pipeline still running. Click the 'Load Run' button to refresh status.")
else:
    st.info("Awaiting a run to monitor.")
