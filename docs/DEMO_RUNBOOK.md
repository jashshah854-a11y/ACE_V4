# ACE Demo Runbook (Phase D)

Goal: Produce a clean, truthful demo run for a marketing dataset (primary) and optionally a restaurant dataset (secondary). This runbook is deterministic and avoids speculative output.

## Prerequisites
- Python environment with backend deps installed (`pip install -r requirements.txt`).
- Node 18+ with `npm install` already run.
- Dataset files available locally.

## Quick Start (Local)

### 1) Start backend
```powershell
cd C:\Users\jashs\Projects\ACE_V4
python -m uvicorn backend.api.server:app --reload
```

### 2) Start frontend
```powershell
cd C:\Users\jashs\Projects\ACE_V4
npm run dev
```

### 3) Run a marketing dataset
- Upload your marketing dataset through the UI.
- Capture the run ID from the UI or backend log.

## Docker Quick Start

Backend only:
```powershell
docker compose up --build
```

Backend + UI:
```powershell
docker compose --profile ui up --build
```

Notes:
- Backend: http://localhost:8080
- UI: http://localhost:5173
- Repo `./data` is mounted to `/app/data` in the container.

## Expected Outputs (Marketing)

These sections must appear when signals exist:
- Marketing Risk Report (CTR/CVR/ROAS/CAC, missing signals flagged).
- Marketing What-If Snapshots (deterministic sensitivity checks).
- Redundancy Report (constants/near-constants/correlation pairs).
- Correlation Insights.

If a signal is missing, the section is suppressed. No empty cards should render.

## Optional: Restaurant Risk Demo

- Upload NYC restaurant inspection dataset.
- Expected section: Restaurant Risk Report.

## Diagnostics Verification

Open Diagnostics for the same run:
```
/app/diagnostics/{RUN_ID}
```

Confirm:
- Trust Model visible with overall confidence.
- Run Health summary present.
- Analytics Validation lists each artifact as valid/invalid.
- Runtime warnings shown when applicable.

## Smoke Tests (Optional)
```powershell
python -m pytest backend/tests/test_redundancy_report.py
python -m pytest backend/tests/test_marketing_simulation.py
```

## Demo Checklist
- [ ] Executive Pulse loads with manifest and no empty sections.
- [ ] Supporting Evidence contains Correlations + Redundancy.
- [ ] Marketing Risk shows detected + missing signals (if any).
- [ ] Marketing What-If Snapshots display scenarios.
- [ ] Diagnostics show trust + validation.

## Notes
- What-If Snapshots are deterministic sensitivity checks, not forecasts.
- Redundancy Report flags constants/near-constants and near-perfect correlations.
- If a section is missing, confirm the underlying signals exist in the dataset.
