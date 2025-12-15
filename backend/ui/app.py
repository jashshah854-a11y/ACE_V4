

def format_timestamp(ts: str) -> str:
    if not ts:
        return "-"
    try:
        clean = ts.replace('Z', '+00:00') if isinstance(ts, str) and ts.endswith('Z') else ts
        dt = datetime.fromisoformat(clean) if isinstance(clean, str) else None
        return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else str(ts)
    except Exception:
        return str(ts)

import io
import json
import os
import html
import time
from datetime import datetime
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
from anti_gravity.utils.presets import MODEL_PRESETS
from anti_gravity.ui.regression_view import render_modeling_controls, render_regression_tab
from anti_gravity.ui.comparison_view import render_comparison_tab

st.set_page_config(page_title="ACE V3 Analytics Engine", layout="wide", page_icon="??")

st.title("ACE V3 Universal Analytics Workbench")
st.caption("Upload data, launch the multi-agent pipeline, and watch each step assemble a consultant-grade report.")

REQUEST_TIMEOUT = 30
RUN_COMPLETE_STATUSES = {"complete", "complete_with_errors", "failed"}
ARTIFACT_ENDPOINTS = {
    "schema": "schema_map",
    "overseer": "overseer_output",
    "regression": "regression_insights",
    "personas": "personas",
    "strategies": "strategies",
    "anomalies": "anomalies",
}
STATUS_EMOJI = {
    "pending": "âšª Pending",
    "running": "ðŸŸ¡ Running",
    "completed": "ðŸŸ¢ Completed",
    "failed": "ðŸ”´ Failed",
}



HUMAN_STATUS_LABELS = {
    "pending": "Pending",
    "running": "Running",
    "completed": "Completed",
    "complete": "Completed",
    "complete_with_errors": "Completed with warnings",
    "failed": "Failed",
    "idle": "Idle",
}

CUSTOM_STYLE = """
<style>
.ace-hero {
  padding: 1.25rem;
  border-radius: 18px;
  background: linear-gradient(135deg, #111827 0%, #1f2937 60%, #312e81 100%);
  color: #f9fafb;
  margin-bottom: 1rem;
}
.ace-hero__pill {
  display: inline-block;
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.16);
  margin-bottom: 0.35rem;
  font-size: 0.85rem;
}
.ace-hero__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.ace-hero__metric {
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0.75rem;
}
.ace-hero__metric span {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(249,250,251,0.7);
}
.ace-hero__metric strong {
  display: block;
  font-size: 1.2rem;
  margin-top: 0.35rem;
}
.ace-card {
  border-radius: 16px;
  padding: 1rem;
  background: rgba(15,23,42,0.04);
  border: 1px solid rgba(99,102,241,0.15);
}
</style>
"""

st.markdown(CUSTOM_STYLE, unsafe_allow_html=True)

def human_status(status: str) -> str:
    if not status:
        return "Idle"
    return HUMAN_STATUS_LABELS.get(status, status.replace('_', ' ').title())

def render_hero_header():
    state = st.session_state.get("pipeline_state") or {}
    run_id = st.session_state.get("run_id") or "New run pending"
    status = state.get("status") or ("pending" if st.session_state.get("run_id") else "idle")
    latest_event = "Ready for your dataset"
    history = state.get("history") or []
    if history:
        latest_event = history[-1].get("event") or latest_event
    profile = st.session_state.get("data_profile") or {}
    rows = profile.get("rows", "-")
    cols = profile.get("cols", "-")
    missing = profile.get("missing_pct", "-")
    hero_html = f"""
    <div class="ace-hero">
        <div class="ace-hero__pill">{html.escape(human_status(status))}</div>
        <div>Run ID: {html.escape(str(run_id))}</div>
        <div style="opacity:0.75;margin-top:4px;">{html.escape(str(latest_event))}</div>
        <div class="ace-hero__grid">
            <div class="ace-hero__metric"><span>Rows</span><strong>{html.escape(str(rows))}</strong></div>
            <div class="ace-hero__metric"><span>Columns</span><strong>{html.escape(str(cols))}</strong></div>
            <div class="ace-hero__metric"><span>Missing %</span><strong>{html.escape(str(missing))}</strong></div>
        </div>
    </div>
    """
    st.markdown(hero_html, unsafe_allow_html=True)

def render_download_center(artifacts: Dict) -> None:
    filtered = {k: v for k, v in artifacts.items() if v}
    if not filtered:
        return
    st.markdown("#### Artifact Downloads")
    try:
        bundle = json.dumps(filtered, indent=2, ensure_ascii=False)
    except (TypeError, ValueError):
        bundle = None
    if bundle:
        st.download_button(
            "Download everything (JSON)",
            data=bundle,
            file_name="ace_artifacts.json",
            mime="application/json",
            use_container_width=True,
        )

def render_insights_timeline(state: Dict) -> None:
    history = state.get("history") if state else None
    if not history:
        return
    st.markdown("#### Insights Timeline")
    for entry in reversed(history[-6:]):
        timestamp = format_timestamp(entry.get("timestamp", ""))
        event = entry.get("event", "")
        st.markdown(f"- **{timestamp}** â€” {event}")




def render_onboarding_panel() -> None:
    st.markdown("### Jumpstart Your Run")
    cards = [
        ("Upload a CSV", "Use the uploader below or drag a file from your desktop."),
        ("Pick a preset", "Apply a Speed Run or High Fidelity preset to pre-fill modeling knobs."),
        ("Track progress", "Watch the hero banner update as each ACE agent completes."),
    ]
    cols = st.columns(len(cards))
    for col, (title, desc) in zip(cols, cards):
        with col:
            st.markdown(f"**{title}**")
            st.caption(desc)
    st.markdown("Need data? [Download a sample dataset](./data/customer_data.csv) to test drive ACE.")












def render_personas_tab(personas):
    persona_list = extract_persona_list(personas)
    if not persona_list:
        st.info("No personas generated.")
        return

    st.markdown("#### Persona Gallery")
    persona_counter = 0
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

                    details_label = f"Persona details - {title} #{persona_counter + 1}"
                    with st.expander(details_label):
                        st.json(persona)
                persona_counter += 1


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
                st.markdown("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n".join(f"- {t}" for t in tactics))
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
    fallback = "https://ace-v4-production.up.railway.app"
    return (secret_base or fallback).rstrip("/")


def api_url(path: str) -> str:
    if not path.startswith("/"):
        path = "/" + path
    return f"{API_BASE_URL}{path}"


def render_artifact_drawer(artifacts: Dict) -> None:
    filtered = {k: v for k, v in (artifacts or {}).items() if v}
    if not filtered:
        return
    with st.expander("Artifact Drawer", expanded=False):
        for alias, payload in filtered.items():
            pretty = alias.replace("_", " ").title()
            artifact_download_button(f"Download {alias}.json", payload, f"{alias}.json")


@st.cache_data(show_spinner=False, ttl=20)
def check_backend_health() -> dict:
    try:
        resp = requests.get(api_url('/runs'), timeout=5)
        resp.raise_for_status()
        body = resp.json()
        available = len(body) if isinstance(body, list) else 'unknown'
        return {"reachable": True, "message": f"{available} runs listed"}
    except requests.RequestException as exc:
        return {"reachable": False, "message": str(exc)}


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

def trigger_remote_run(file_name: str, file_bytes: bytes, config: Optional[Dict] = None) -> Dict:
    files = {"file": (file_name or "uploaded.csv", file_bytes, "text/csv")}
    data: Dict[str, str] = {}
    if config:
        target = config.get("target_column")
        if target:
            data["target_column"] = target
        feature_list = config.get("feature_whitelist") or []
        if feature_list:
            try:
                data["feature_whitelist"] = json.dumps(feature_list)
            except (TypeError, ValueError):
                pass
        model_choice = config.get("model_type")
        if model_choice:
            data["model_type"] = model_choice
        if "include_categoricals" in config:
            data["include_categoricals"] = str(bool(config.get("include_categoricals"))).lower()
        if "fast_mode" in config:
            data["fast_mode"] = str(bool(config.get("fast_mode"))).lower()
    resp = requests.post(api_url("/run"), files=files, data=data or None, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def fetch_run_state(run_id: str) -> Optional[Dict]:
    resp = requests.get(api_url(f"/runs/{run_id}/state"), timeout=REQUEST_TIMEOUT)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def fetch_run_list() -> list:
    resp = requests.get(api_url('/runs'), timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    if isinstance(resp.json(), list):
        return resp.json()
    return []


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

def load_comparison_bundle(run_a: str, run_b: str) -> Dict[str, Dict]:
    run_a = (run_a or "").strip()
    run_b = (run_b or "").strip()
    if not run_a or not run_b:
        raise ValueError("Provide two run IDs to compare.")
    if run_a == run_b:
        raise ValueError("Pick two different runs for comparison.")

    bundle: Dict[str, Dict] = {}
    for label, run_id in (("A", run_a), ("B", run_b)):
        state = fetch_run_state(run_id)
        if state is None:
            raise ValueError(f"Run {run_id} was not found.")
        artifacts = load_artifacts(run_id)
        bundle[label] = {"run_id": run_id, "state": state, "artifacts": artifacts}
    return bundle



API_BASE_URL = resolve_api_base()

backend_health = check_backend_health()
status_cols = st.columns([3, 1])
with status_cols[1]:
    if backend_health.get('reachable'):
        st.success(f"Backend online\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n{API_BASE_URL}", icon="âœ…")
    else:
        st.error(f"Backend unreachable\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n{backend_health.get('message', 'unknown error')}", icon="âš ï¸")

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
if "auto_refresh_enabled" not in st.session_state:
    st.session_state.auto_refresh_enabled = True
if "last_state_poll" not in st.session_state:
    st.session_state.last_state_poll = None
if "api_error" not in st.session_state:
    st.session_state.api_error = None
if "modeling_config" not in st.session_state:
    st.session_state.modeling_config = {}
if "comparison_data" not in st.session_state:
    st.session_state.comparison_data = None
if "comparison_error" not in st.session_state:
    st.session_state.comparison_error = None
if "compare_run_a" not in st.session_state:
    st.session_state.compare_run_a = ""
if "compare_run_b" not in st.session_state:
    st.session_state.compare_run_b = ""

render_hero_header()

with st.container():
    st.markdown('**How It Works**')
    overview_cols = st.columns(3)
    onboarding = [
        ("ðŸ“¤ Upload", "Drop in a single CSV with behavioral or customer data."),
        ("ðŸ¤– Pipeline", "ACE launches Scanner âžœ Expositor automatically."),
        ("ðŸ“Š Review", "Track each agent, inspect artifacts, download the final report."),
    ]
    for col, (title, desc) in zip(overview_cols, onboarding):
        with col:
            st.markdown(f'**{title}**')
            st.caption(desc)

with st.sidebar:
    st.subheader("Recent Runs")
    if st.button("â†» Refresh list", key="refresh-recent-runs"):
        load_recent_runs.clear()
    recent_runs = load_recent_runs(limit=8)
    if recent_runs:
        for run_meta in recent_runs:
            run_label = f"{run_meta['run_id']} Â· {run_meta['status'].replace('_', ' ').title()}"
            timestamp = format_timestamp(run_meta.get('updated_at'))
            if st.button(run_label, key=f"sidebar-run-{run_meta['run_id']}"):
                st.session_state.run_id = run_meta['run_id']
                st.session_state.pipeline_state = None
                st.session_state.pipeline_artifacts = {}
                st.session_state.artifacts_run_id = None
                st.session_state['existing_run_id'] = run_meta['run_id']
            st.caption(f"Updated {timestamp}")
    else:
        st.caption("No previous runs found. Upload a dataset to get started.")

show_onboarding = not st.session_state.get("run_id")

uploaded_file = st.file_uploader(
    "Drag & drop your CSV", type=["csv"], help="ACE only needs a single CSV. Join tables beforehand if needed."
)

file_bytes = None
preview_df = None

if not uploaded_file and show_onboarding:
    render_onboarding_panel()

if uploaded_file:
    file_bytes = uploaded_file.getvalue()
    try:
        preview_df = load_preview_dataframe(file_bytes)
    except Exception:
        preview_df = None
        st.warning("Uploaded file detected, but Streamlit could not preview it. The ACE engine can still run.")

    if preview_df is not None:
        sampled_rows, cols = preview_df.shape
        total_rows_estimate = max(file_bytes.count(b'\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\n') - 1, sampled_rows) if file_bytes else sampled_rows
        missing_pct = (preview_df.isna().sum().sum() / (sampled_rows * cols) * 100) if sampled_rows and cols else 0
        st.session_state.data_profile = {
            "rows": f"~{total_rows_estimate:,}" if total_rows_estimate != sampled_rows else f"{sampled_rows:,}",
            "cols": cols,
            "missing_pct": round(missing_pct, 2)
        }
        st.subheader("Quick Dataset Glance")
        metrics = st.columns(3)
        metrics[0].metric("Rows (est.)", st.session_state.data_profile['rows'])
        metrics[1].metric("Columns", f"{cols:,}")
        metrics[2].metric("Missing %", f"{st.session_state.data_profile['missing_pct']}%")
        st.caption("Preview limited to the first 1,000 rows for responsiveness.")
        st.dataframe(preview_df.head(100), use_container_width=True)
        render_modeling_controls(preview_df)
    else:
        st.session_state.data_profile = None

    st.info("Ready! Click below to hand the dataset to the ACE backend.")
    run_clicked = st.button("?? Launch ACE Pipeline", use_container_width=True)

    if run_clicked and file_bytes:
        with st.spinner("Uploading file and initializing ACE orchestrator..."):
            try:
                config_payload = current_run_config()
                response = trigger_remote_run(uploaded_file.name, file_bytes, config=config_payload)
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
        else:
            st.error("ACE backend did not return a run ID. Please check backend logs and try again.")


st.divider()
st.subheader("Pipeline Monitor")

st.checkbox("Auto-refresh while pipeline is active", value=st.session_state.get("auto_refresh_enabled", True), key="auto_refresh_enabled")
if st.session_state.api_error:
    st.warning(f"API error: {st.session_state.api_error}")
elif st.session_state.last_state_poll:
    human_time = datetime.fromtimestamp(st.session_state.last_state_poll).strftime('%H:%M:%S')
    st.caption(f"Last updated at {human_time}")

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

st.markdown("#### Compare Runs")
cmp_col1, cmp_col2, cmp_load, cmp_clear = st.columns([1, 1, 0.7, 0.7])
cmp_col1.text_input("Run A", key="compare_run_a")
cmp_col2.text_input("Run B", key="compare_run_b")
if cmp_load.button("Load comparison"):
    try:
        st.session_state.comparison_data = load_comparison_bundle(st.session_state.compare_run_a, st.session_state.compare_run_b)
        st.session_state.comparison_error = None
    except Exception as exc:
        st.session_state.comparison_error = str(exc)
if cmp_clear.button("Clear", key="clear-comparison"):
    st.session_state.comparison_data = None
    st.session_state.comparison_error = None
if st.session_state.get("comparison_error"):
    st.warning(f"Comparison error: {st.session_state.comparison_error}")

pipeline_state = None
run_not_found = False
if st.session_state.run_id:
    try:
        pipeline_state = fetch_run_state(st.session_state.run_id)
        if pipeline_state is None:
            run_not_found = True
        else:
            st.session_state.api_error = None
            st.session_state.last_state_poll = time.time()
    except requests.RequestException as exc:
        st.session_state.api_error = str(exc)

if pipeline_state:
    st.session_state.pipeline_state = pipeline_state
elif run_not_found:
    st.session_state.pipeline_state = None
    st.session_state.pipeline_artifacts = {}
    st.session_state.artifacts_run_id = None

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
            emoji = STATUS_EMOJI.get(step_state.get("status", "pending"), "âšª Pending")
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
        regression = artifacts.get("regression")
        personas = artifacts.get("personas")
        strategies = artifacts.get("strategies")
        anomalies = artifacts.get("anomalies")
        final_report = artifacts.get("final_report")

        tab_labels = [
            "Overview", "Schema", "Clusters", "Regression", "Personas", "Strategies", "Anomalies", "Final Report"
        ]
        if st.session_state.get("comparison_data"):
            tab_labels.append("Compare")
        tabs = st.tabs(tab_labels)
        tab_map = dict(zip(tab_labels, tabs))

        with tab_map["Overview"]:
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
                render_insights_timeline(state)

            render_download_center(artifacts)
            render_artifact_drawer(artifacts)

        with tab_map["Schema"]:
            st.subheader("Schema Intelligence")
            render_schema_tab(schema)
            artifact_download_button("Download schema_map.json", schema, "schema_map.json")

        with tab_map["Clusters"]:
            st.subheader("Clusters & Fingerprints")
            render_clusters_tab(overseer)
            artifact_download_button("Download overseer_output.json", overseer, "overseer_output.json")

        with tab_map["Regression"]:
            st.subheader("Regression Modeling")
            render_regression_tab(regression)
            artifact_download_button("Download regression_insights.json", regression, "regression_insights.json")

        with tab_map["Personas"]:
            st.subheader("Personas")
            render_personas_tab(personas)
            artifact_download_button("Download personas.json", personas, "personas.json")

        with tab_map["Strategies"]:
            st.subheader("Strategies")
            render_strategies_tab(strategies)
            artifact_download_button("Download strategies.json", strategies, "strategies.json")

        with tab_map["Anomalies"]:
            st.subheader("Anomalies")
            render_anomalies_tab(anomalies)
            artifact_download_button("Download anomalies.json", anomalies, "anomalies.json")

        with tab_map["Final Report"]:
            st.subheader("Final Report")
            render_final_report_tab(final_report)

        if "Compare" in tab_map and st.session_state.get("comparison_data"):
            with tab_map["Compare"]:
                render_comparison_tab(st.session_state.comparison_data)
    else:
        st.info("Pipeline still running. Auto-refresh is enabled when the toggle above is on.")
else:
    if run_not_found:
        st.warning(f"Run ID {st.session_state.run_id!r} was not found. Verify the value and try again.")
    elif st.session_state.run_id:
        st.info("Awaiting orchestrator updates for this run...")
    else:
        st.info("Awaiting a run to monitor.")

should_auto_refresh = (
    bool(st.session_state.get('run_id'))
    and st.session_state.get('auto_refresh_enabled', True)
    and not run_not_found
    and (not st.session_state.get('pipeline_state') or st.session_state.pipeline_state.get('status') not in RUN_COMPLETE_STATUSES)
)
if should_auto_refresh:
    st.caption(f'Auto refresh enabled - next update in {AUTO_REFRESH_INTERVAL_SECONDS}s.')
    time.sleep(AUTO_REFRESH_INTERVAL_SECONDS)
    st.experimental_rerun()



