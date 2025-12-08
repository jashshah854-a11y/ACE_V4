import streamlit as st
import sys
import json
import pandas as pd
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from ace_v3_entry import run_ace_v3
from core.state_manager import StateManager

st.set_page_config(page_title="ACE V3 Dashboard", layout="wide", page_icon="🧠")

st.title("🧠 ACE V3: Autonomous Cognitive Entity")
st.markdown("### Universal Customer Intelligence Engine")

# Sidebar
st.sidebar.header("Control Panel")
uploaded_file = st.sidebar.file_uploader("Upload Dataset (CSV)", type="csv")

if uploaded_file:
    # Save uploaded file
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    file_path = data_dir / uploaded_file.name
    
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
        
    st.sidebar.success(f"Uploaded: {uploaded_file.name}")
    
    if st.sidebar.button("🚀 Launch ACE Engine"):
        with st.spinner("ACE is thinking... (Scanner -> Interpreter -> Overseer -> Sentry -> Personas -> Fabricator -> Expositor)"):
            try:
                run_id, run_path = run_ace_v3(str(file_path))
                st.session_state["last_run_id"] = run_id
                st.session_state["last_run_path"] = run_path
                st.success(f"Run Complete! ID: {run_id}")
            except Exception as e:
                st.error(f"ACE Crashed: {e}")
                st.exception(e)

# Auto-load latest run for verification
if "last_run_id" not in st.session_state:
    # Find latest run
    runs_dir = Path("data/runs")
    if runs_dir.exists():
        runs = sorted([d for d in runs_dir.iterdir() if d.is_dir()], reverse=True)
        if runs:
            latest = runs[0]
            st.session_state["last_run_id"] = latest.name
            st.session_state["last_run_path"] = str(latest)
            st.info(f"Auto-loaded latest run: {latest.name}")

# Display Results
if "last_run_id" in st.session_state:
    run_id = st.session_state["last_run_id"]
    run_path = st.session_state["last_run_path"]
    state = StateManager(run_path)
    
    st.divider()
    st.header(f"Run Results: {run_id}")
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["📄 Final Report", "👥 Personas", "🎯 Strategies", "📊 Clusters", "⚠️ Anomalies"])
    
    with tab1:
        report_path = Path(run_path) / "final_report.md"
        if report_path.exists():
            with open(report_path, "r", encoding="utf-8") as f:
                report_content = f.read()
            st.markdown(report_content)
        else:
            st.warning("No report found.")
            
    with tab2:
        personas_data = state.read("personas")
        if personas_data and "personas" in personas_data:
            for p in personas_data["personas"]:
                with st.expander(f"{p.get('name', 'Unknown')} ({p.get('label', '')})"):
                    st.write(p.get("summary", ""))
                    st.json(p)
        else:
            st.info("No personas generated.")

    with tab3:
        strategies_data = state.read("strategies")
        if strategies_data and "strategies" in strategies_data:
            for s in strategies_data["strategies"]:
                st.markdown(f"### {s.get('persona_name')}")
                st.info(f"**{s.get('headline')}**")
                for tactic in s.get("tactics", []):
                    st.write(f"- {tactic}")
                st.divider()
        else:
            st.info("No strategies generated.")
            
    with tab4:
        overseer_data = state.read("overseer_output")
        if overseer_data:
            st.json(overseer_data.get("stats", {}))
            if "fingerprints" in overseer_data:
                st.write("Cluster Fingerprints:")
                st.dataframe(pd.DataFrame(overseer_data["fingerprints"]).T)
        else:
            st.info("No clustering data.")

    with tab5:
        sentry_data = state.read("anomalies")
        if sentry_data:
            st.metric("Total Anomalies", sentry_data.get("anomaly_count", 0))
            if "drivers" in sentry_data:
                st.write("Top Anomaly Drivers:")
                st.json(sentry_data["drivers"])
        else:
            st.info("No anomalies detected.")

else:
    st.info("👈 Upload a CSV and click 'Launch ACE Engine' to start.")
