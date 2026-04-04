# ACE V4 — Autonomous Customer Engagement System

## What This Is
A multi-agent AI analytics platform that accepts CSV/data uploads, runs a 19-step automated analysis pipeline (clustering, regression, anomaly detection, AI insight synthesis, narrative generation), and produces executive-grade reports. Backend is Python/FastAPI multi-agent; frontend is a React SPA that monitors pipeline progress and renders reports.

## Current State
Done / Maintaining. Deployed on Railway (primary). Full pipeline sequence is functional. Quality threshold is intentionally low (5%) to accept diverse datasets. Not actively being feature-developed — maintenance mode.

## Architecture

### Frontend (React SPA)
- 4 routes: `/` (upload), `/pipeline/:runId` (live progress), `/report/:runId` (rendered report), `/history`
- TanStack Query polls pipeline status from backend
- shadcn-ui + Tailwind component layer

### Backend (Python/FastAPI)
- `backend/orchestrator.py` — main pipeline runner; iterates through PIPELINE_SEQUENCE, calls each agent
- `backend/core/pipeline_map.py` — defines PIPELINE_SEQUENCE (19 steps) and maps to UI stages
- `backend/agents/` — 20+ individual agent modules (one Python file per agent)
- Runs stored as folders under `backend/data/runs/<runId>/` (also at `/data` on Railway shared volume `ace-v4-volume`)
- `StateManager` manages per-run JSON state; `ProgressTracker` emits SSE/polling updates

### Pipeline Sequence (in order)
`type_identifier → scanner → interpreter → validator → overseer → regression → time_series → sentry → personas → fabricator → raw_data_sampler → deep_insight → dot_connector → hypothesis_engine → so_what_deepener → story_framer → executive_narrator → expositor → trust_evaluation`

`expositor` assembles final report; `trust_evaluation` always runs last. Enforced by guards in `orchestrator.py`.

## Tech Stack
- Frontend: React 18.3.1 + TypeScript + Vite + React Router + TanStack Query + shadcn-ui + Tailwind
- Backend: Python 3.11 + FastAPI + uvicorn + Pydantic v2 + pandas + scikit-learn + numpy
- Deploy: Railway (nixpacks.toml + railway.toml, shared volume `ace-v4-volume`), Vercel (legacy)
- Start command: `uvicorn backend.api.server:app --host 0.0.0.0 --port $PORT`

## Key Files
- `backend/core/config.py` — All settings (Pydantic BaseSettings); DATA_DIR, quality thresholds, CORS, upload limits
- `backend/core/pipeline_map.py` — PIPELINE_SEQUENCE list (single source of truth for pipeline order)
- `backend/orchestrator.py` — Main pipeline execution loop
- `backend/api/server.py` — FastAPI app, all HTTP routes, CORS setup
- `backend/agents/` — One file per agent
- `backend/core/state_manager.py` — Per-run state read/write
- `nixpacks.toml` + `railway.toml` — Railway build and volume config

## Commands
```bash
npm run dev                                                    # Frontend dev (localhost:5173)
uvicorn backend.api.server:app --host 0.0.0.0 --port 8001 --reload  # Backend dev
python backend/run_full_chain.py                               # Full pipeline test
docker-compose up --build                                      # Full local stack
```

## Conventions
- Each agent in `backend/agents/` must be self-contained; orchestrator calls them by name from PIPELINE_SEQUENCE
- Agent output written to run folder as JSON artifacts via StateManager
- Settings are never hardcoded — always use `settings` from `backend/core/config.py`
- Run data lives under `DATA_DIR / "runs" / runId` — never write outside this path
- Quality threshold is intentionally low (0.05) — do not raise without discussion
- Repo is public on GitHub and secrets-clean (scanned 2026-02-18)

## Do Not Touch
- `backend/core/pipeline_map.py` PIPELINE_SEQUENCE order — orchestrator has guards enforcing expositor and trust_evaluation positions
- `ace-v4-volume` Railway shared volume — both services depend on this for file sharing at `/data`
- `backend/core/config.py` DATA_DIR resolution — anchored to project root via __file__; do not change resolution chain
- CORS origins in config.py — includes Vercel legacy deploy URL; removing breaks legacy frontend

## Active Priorities
- Maintenance mode — no active feature development
- Pipeline reliability is the main concern: expositor must produce valid report even if upstream agents partially fail
- Upload limit is 600MB — intentional for large CSV files
