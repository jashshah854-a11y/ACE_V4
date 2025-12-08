
import pandas as pd
import streamlit as st
import requests
from typing import Dict, Optional

# Assume api_url and ARTIFACT_ENDPOINTS are needed if we port load_comparison_bundle fully.
# However, `load_comparison_bundle` relies on `fetch_run_state` etc. which are currently in app.py.
# To handle this cleanly without circular imports, we might need to pass the fetcher function or move fetchers.
# For now, let's assume this view just renders data, and data loading stays in app.py or is passed in.
# Wait, the plan said "Extract `load_comparison_bundle` from `app.py`".
# That function uses `fetch_run_state` and `load_artifacts`.
# If I move `load_comparison_bundle`, I need to move the fetchers too, or import them.
# Let's import them from a shared place or duplicates for now? No, duplication is bad.
# Let's leave `load_comparison_bundle` in app.py but refactor it later if needed, OR import it.
# Actually, the user asked to "consolidate a snapshot".
# I'll create the view functions here, and we can refactor the data loading if it becomes too tangled.
# Observing `app.py`: `fetch_run_state` uses `api_url`.
# I will try to make `render_comparison_tab` self-contained and assume `bundle` is passed in.
# I will leave `load_comparison_bundle` in `app.py` or move it to a `data_client.py` if I was doing a full refactor.
# But per plan I said "Extract `render_comparison_tab`, `load_comparison_bundle`".
# I'll move `load_comparison_bundle` but I'll need to pass the `fetch_run_state` callback or similar.
# Actually, better yet, let's keep `load_comparison_bundle` in `app.py` for now to avoid breaking the API logic which relies on global vars in app.py
# like API_BASE_URL.
# Wait, I committed to moving it. I should try to move it if possible.
# If I move it, I need `fetch_run_state` and `load_artifacts`.
# Let's inspect `app.py` again. `fetch_run_state` is a simple wrapper around requests.
# I will REPLICATE the fetch logic or Import it.
# Circular import risk: app.py imports anti_gravity... anti_gravity imports app.py? BAD.
# I will keeping `load_comparison_bundle` in `app.py` or move the networking to `utils/api_client.py`.
# I'll stick to just the UI rendering for now to be safe, and if I see I can move the loader I will.
# Actually, `render_comparison_tab` is what matters most for the "View".

def render_comparison_tab(bundle: Dict[str, Dict]) -> None:
    run_a = bundle.get("A")
    run_b = bundle.get("B")
    if not run_a or not run_b:
        st.info("Provide two completed runs to see comparison analytics.")
        return

    def summarize(entry: Dict) -> Dict:
        state = entry.get("state") or {}
        artifacts = entry.get("artifacts") or {}
        overseer = (artifacts.get("overseer") or {}).get("stats", {})
        regression = artifacts.get("regression") or {}
        regression_metrics = regression.get("metrics") or {}
        return {
            "status": state.get("status", "-"),
            "clusters": overseer.get("k"),
            "silhouette": overseer.get("silhouette"),
            "regression_r2": regression_metrics.get("r2"),
            "regression_mae": regression_metrics.get("mae"),
            "model": regression.get("model", "-"),
        }

    rows = []
    for label, entry in (("Run A", run_a), ("Run B", run_b)):
        summary = summarize(entry)
        summary["Run"] = f"{label} ({entry.get('run_id')})"
        rows.append(summary)

    if rows:
        df = pd.DataFrame(rows).set_index("Run")
        st.dataframe(df, use_container_width=True)

    r2_a = rows[0].get("regression_r2")
    r2_b = rows[1].get("regression_r2")
    if r2_a is not None and r2_b is not None:
        delta = r2_b - r2_a
        st.metric("R^2 delta (Run B - Run A)", f"{delta:+.2f}", help="Positive delta = Run B improved R^2")

    st.caption("Cluster counts: Run A = {a}, Run B = {b}".format(
        a=rows[0].get("clusters", "-"), b=rows[1].get("clusters", "-")))

    for label, entry in (("Run A", run_a), ("Run B", run_b)):
        with st.expander(f"{label} details"):
            state = entry.get("state") or {}
            artifacts = entry.get("artifacts") or {}
            st.write(f"Status: {state.get('status', '-')}")
            if artifacts.get("regression"):
                st.write("Regression: r2=", artifacts["regression"].get("metrics", {}).get("r2"))
            if artifacts.get("overseer"):
                st.write("Clusters:", (artifacts["overseer"].get("stats") or {}).get("k"))
