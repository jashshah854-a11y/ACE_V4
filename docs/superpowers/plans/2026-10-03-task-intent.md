# Task Intent Preservation Implementation Plan

**Goal:** Preserve the submitted analysis question and context from upload to report without interpreting the request as evidence.

**Architecture:** Extend the existing run configuration, state artifacts, task contract, and snapshot. Narrative builders read the same stored intent. Legacy runs with no intent remain explicitly unknown.

**Tech stack:** FastAPI, Python, React, TypeScript, pytest, Vitest, Vite.

## Scope and files

- `backend/api/server.py`: accept optional JSON `task_intent`, reject invalid values with HTTP 422 before enqueueing, and expose intent in both snapshot modes.
- `backend/core/task_contract.py`: restore the intent parser required by existing callers, normalize the legacy `question` alias, validate supplied field types, and preserve intent in contracts.
- `backend/orchestrator.py`: persist intent with run configuration before building governance artifacts.
- `backend/agents/deep_insight.py`, `story_framer.py`, `executive_narrator.py`, and `backend/core/smart_narrative.py`: include the original request in narrative context, labelled as a request rather than measured evidence.
- `src/lib/types.ts` and `src/pages/ReportPage.tsx`: type and display the question, decision context, success criteria, and explicit missing-intent state.
- `backend/tests/test_task_intent_flow.py`, `test_narrative_task_intent.py`, and `src/pages/__tests__/ReportPage.test.tsx`: regression coverage for these boundaries.

## Execution

- [x] Trace upload, queue, ingestion, contract rebuild, narrative paths, and snapshot.
- [x] Write tests for uploaded intent retention, malformed JSON/type rejection, no-intent compatibility, real local ingestion, snapshot round trip, narrative context, and report display.
- [x] Observe regression failures against the unchanged configuration builder, narrative modules, and report page.
- [x] Add `task_intent: Optional[str] = Form(None)` and pass it to `_build_run_config`; parse once and retain the normalized dictionary under `config["task_intent"]`.
- [x] Persist `state_manager.write("task_intent", run_config["task_intent"])`; pass the same dictionary to `build_task_contract(..., user_intent=...)`.
- [x] Return `state.read("task_intent")` in the snapshot and consume it in the existing narrative builders and report page.
- [ ] Run backend collection and applicable tests in disposable directories with external sockets blocked; run `npm test` and `npm run build`.
- [x] Inspect the report at 390x844, 1366x768, and 1440x900 and exercise its primary tab interaction using controlled snapshot fixtures.
- [ ] Append the verified decision and rejected alternatives to `DECISIONS.md`; inspect the diff, then commit only if the required gates pass.

## Deferred to subsequent iterations

Manifest-backed report validity, missing-metric semantics, inspectable segmentation/risk, and deterministic scenarios remain separate improvements. Do not revive the legacy dashboard or rewrite unrelated analytics to make this change look complete.

## Verification outcome

The draft is blocked and uncommitted. All 23 new backend checks and all 29 frontend tests pass, as does the production build. The expanded backend check still has four pre-existing failures and full collection aborts in a standalone test script. See `DECISIONS.md` for the exact stopping point and remaining work. Restoring the active `core.sentry` dependency cleared the new real governance-rebuild test; it did not clear the complete release gate.
