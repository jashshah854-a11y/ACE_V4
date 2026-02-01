# System Playbook

This document is the operational contract for correctness, routing, and trust enforcement.
It is intentionally brief and points to the authoritative code.

## Run Manifest
- Schema and defaults: `backend/core/run_manifest.py`
- Artifact registry and render policy updates: `backend/core/run_manifest.py`
- Manifest snapshot tests: `backend/tests/test_run_manifest_snapshot.py`

## Trust Model
- Trust scoring rules: `backend/core/trust_model.py`
- Trust evaluation step integration: `backend/agents/trust_evaluation.py`

## Routing Matrix
- Classification tags and routing rules: `backend/core/analysis_routing.py`
- Routing tests: `backend/tests/test_phase4_routing.py`

## Invariants
- Registry and checks: `backend/core/invariants.py`
- Invariant tests: `backend/tests/test_phase5_invariants.py`

## Failure Handling
- Pipeline orchestration and step status: `backend/orchestrator.py`
- Artifact validation and persistence gates: `backend/core/state_manager.py`
- Run health summary artifact: `backend/core/run_health.py`

## Golden Run Suite
- Golden test runner: `backend/tests/test_phase5_golden_runs.py`
- Run with `ACE_RUN_GOLDEN=1` to execute full pipeline.
- Set `ACE_GOLDEN_UPDATE=1` to write new snapshots.
