# Phase 2 - Connector & Scheduler Design

## Goals
- Enable recurring ingestion from cloud/object stores or watched folders.
- Provide lightweight scheduling that feeds the existing job queue (no pipeline rewrites).
- Keep connectors optional behind a flag so manual uploads remain default.

## Connector Abstraction
- Central config file (default `data/connectors.json`, override with `settings.connectors_config_path`).
- Each entry: `{ "name": str, "type": str, "enabled": bool, "interval_seconds": int, "options": {..} }`.
- `connectors.base.SourceConnector` exposes:
  - `pull()` downloads data into workspace and returns `ConnectorResult(file_path, metadata)`.
  - `describe()` for logging.
  - `cleanup()` optional hook for temp files.
- Initial connector types:
  1. `local_file`: watches a directory/glob, copies most recent file, optional archive.
  2. `s3`: downloads newest object from bucket/prefix (requires boto3/aws creds).
  3. `snowflake`: executes SQL against Snowflake and exports results to CSV (needs `snowflake-connector-python`).
  4. `bigquery`: runs SQL via Google BigQuery client and saves CSV (needs `google-cloud-bigquery`).
  5. `webhook`: pulls data from an HTTP endpoint (GET/POST) and stores the response payload.

## Scheduler Loop
- New module `jobs.scheduler` acts as headless worker; invoked via `python -m jobs.scheduler` or `python backend/jobs/scheduler.py`.
- Reads connectors config plus `settings.connector_state_path` (JSON storing last_run timestamps/errors).
- Poll interval `settings.scheduler_poll_seconds` (default 60s).
- For each enabled connector due to run:
  1. Run `pull()` (with try/finally to call `cleanup`).
  2. Store downloaded file under `data/uploads/connectors/{connector}/{timestamp}.ext`.
  3. Enqueue via `jobs.queue.enqueue(local_path, run_config={"source": {"connector": name, ...}})`.
  4. Update `scheduler_state.json` with `last_run_at`, `last_status`, `error` if any.
- Scheduler is idempotent/resume-safe because state lives on disk.

## Feature Flagging / Compatibility
- New settings:
  - `connectors_enabled: bool = False`
  - `connectors_config_path`, `connector_state_path`, `scheduler_poll_seconds`.
- API `/run` untouched except for optional metadata (already supports `run_config`).
- If connectors disabled or config empty, scheduler exits quickly without changing filesystem.

## CLI Management
- CLI lives at `python -m backend.cli.connectors` and requires `ACE_CONNECTORS_ENABLED=1`.
- Commands:
  - `list` – prints all connector configs as JSON.
  - `add --name foo --type local_file --options path=/data,interval_seconds=300` – creates/updates entries.
  - `delete --name foo` – removes a connector.
  - `toggle --name foo --enable/--disable` – flips status.
- Options can be passed inline (`key=value`) or via `--options-file path/to/options.json`.

## Testing Strategy
- Unit tests for `LocalFileConnector` selection plus copy semantics.
- Tests for `ConnectorRunner` filtering and due calculations using a temp config file.
- Scheduler load test simulating multiple connectors firing simultaneously (mock enqueue ensures each triggers a run).
- Manual runbook: start scheduler alongside worker; verify new runs appear with `source.connector` metadata.
