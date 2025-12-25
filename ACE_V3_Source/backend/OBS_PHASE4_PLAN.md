# Phase 4 – Observability & Resilience Plan

## Goals
- Provide structured logs + metrics for scheduler, worker, orchestrator so failures surface quickly.
- Add chaos/load tests to validate recovery and concurrency behavior before production runs.

## Logging & Metrics
1. Adopt structured logging (JSON lines) via a helper `observability/logger.py`.
   - Fields: timestamp, level, component (scheduler/worker/orchestrator), run_id, connector, message, extra.
   - Log sinks: stdout by default, optional file via env var.
2. Instrument metrics via a simple in-process collector (`observability/metrics.py`) with Prometheus-style counters/gauges:
   - `scheduler_runs_total{connector}`
   - `scheduler_failures_total{connector}`
   - `worker_jobs_inflight`
   - `worker_job_duration_seconds` (histogram)
3. Provide a `/metrics` endpoint (FastAPI) to scrape metrics when env flag enabled.

## Resilience Enhancements
1. Scheduler retry/backoff for intermittent connector failures with exponential backoff metadata.
2. Worker heartbeat file (`data/worker_heartbeat.json`) updated each cycle; CLI command to inspect lag.
3. Load-shedding config: max concurrent jobs per connector type to avoid pileups.

## Chaos & Pressure Testing
1. Add `tests/test_scheduler_chaos.py`:
   - Mocks connectors to throw intermittent errors; assert retries + metrics increments.
2. Add `tests/test_worker_recovery.py`:
   - Simulates job failure mid-run, verifies job status -> FAILED and metrics/log entries exist.
3. CLI script `scripts/chaos_scheduler.py` to kill/restart scheduler while queue has pending jobs; ensures scheduler restarts without losing state.
4. Document manual runbook: start scheduler/worker, tail structured logs, run chaos script, confirm metrics.

## Implementation Steps
1. Create `backend/observability/logger.py` + `metrics.py` utilities; integrate into scheduler, worker, orchestrator.
2. Wire FastAPI `/metrics` endpoint behind `OBS_METRICS_ENABLED` flag.
3. Update requirements/tests to cover new utilities.
4. Run chaos scripts + pytest suites; log issues and iterate.
