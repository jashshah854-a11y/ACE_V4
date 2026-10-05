# ACE decisions

## 2026-10-03 — Iteration 1 draft: retain the analysis request

**Status: blocked, uncommitted. No iteration has shipped.**

The active upload endpoint discarded `task_intent`. The draft accepts and validates it before queueing, retains it in the existing run configuration and state, passes it into the task contract, exposes it in snapshots, includes the complete request in narrative context, and displays the original question/context/criteria on the report page. Narrative prompts distinguish the request from measured evidence. Invalid JSON, missing or invalid questions, unsupported output types, and invalid confidence thresholds return HTTP 422. Uploads that omit intent remain compatible and do not receive an invented question.

The real contract-rebuild test exposed an import of the deleted `core.sentry` module. Its complete 59-line implementation was inspected in Git history and restored from `0440992^` because active governance still requires `EvidenceSentry`. The rebuild now passes. No legacy dashboard code was restored.

The same integration requires the existing `is_signed` contract flag: it stays false when intent is omitted and becomes true only after a supplied request passes validation. This matches the flag's historical meaning and current governance consumer. An independent review verified the caller/rebuild behavior.

Forks considered:

- **Use existing run state versus add a new intent store:** use existing state and configuration so the queue, orchestrator, narrative agents, and snapshot share the same request.
- **Require intent for every upload versus accept legacy uploads without it:** preserve compatibility and show an explicit missing-question state. Do not synthesize context for old runs.
- **Preserve submitted text versus rewrite or trim it:** preserve it, including Unicode and internal whitespace. Normalize only the existing `question` alias to `primary_question`; the canonical field wins if both are supplied.
- **Treat a saved request as evidence versus label it separately:** the request focuses analysis; it does not substantiate a finding.
- **Skip failing governance checks versus keep the release gate:** keep the gate. Existing backend failures must be resolved before this draft can be called shippable.

Verification and stopping point:

- All **23 new backend checks pass** in the final pinned environment, including HTTP upload validation, real local CSV ingestion, persisted state, real contract rebuild, both snapshot modes, narrative-context preservation, and the validated-request flag. Provider calls were not used.
- Expanded backend check: **32 passed, 4 failed**. The failures are `test_fabricator_blocked_without_financial_capability`, `test_business_intel_section_surfaces_evidence_and_risk`, `test_task_contract_blocks_financial_claims_without_financial_columns`, and `test_task_contract_honors_user_forbidden_claims`. These expose existing claim-restriction and evidence/risk reporting gaps. The two former production implementations are unchanged; inspection of `HEAD` confirms missing contract restrictions also predate this draft.
- Full backend collection aborts because `test_new_components.py` runs a standalone suite and calls `sys.exit` at import time, even when its checks succeed. A diagnostic pass excluding that file does not waive it from the release gate. Other pre-existing import/dependency failures were also investigated.
- Frontend: **9 test files, 29 tests passed** with `npm run test -- --testTimeout=20000`. The higher per-test timeout accommodates this host; assertions and test coverage were unchanged. Focused ESLint passed for the modified frontend files.
- Production Vite build passed, transforming 2,307 modules into a fresh temporary output directory; existing `dist` was untouched.
- Browser fixture checks passed at **390x844, 1366x768, and 1440x900**: request panel visible, no page overflow, Full Report/Executive Summary tab interactions passed, and no browser errors. All three screenshots were inspected. This proves the changed UI with controlled fixtures, not a successful live pipeline run.
- Isolated Python dependencies installed from both existing requirements files; `pip check` reports no broken requirements.
- Missing optional test dependencies were installed only in the local `.venv`. Final compatibility verification retained NumPy **1.26.4** and pandas **2.2.3** with SHAP **0.46.0**, ONNX **1.16.2**, and ml-dtypes **0.3.2**; DuckDB **1.5.6**, Polars **1.44.2**, skl2onnx **1.20.0**, and onnxruntime **1.30.0** are also present. Final `pip check` reports no broken requirements. An initial optional-package resolver upgrade was corrected before closing the work.
- Independent review found no newly introduced retention, validation, or input-mutation defect in the changed path. `git diff --check` passed.

The user requires the test suite and production build to pass before a shippable commit and explicitly permits stopping when tests cannot go green. The complete backend gate is still red after the connected repair. Stop here instead of skipping baseline failures, weakening assertions, or widening this iteration into a test-harness and analytics-policy rewrite. No commit, push, deployment, or provider execution was performed.

The manifest registration/render gate and missing-metric claims are still unresolved. Segmentation/risk inspection and deterministic what-if work have not started. Existing `CLAUDE.md` and `PROJECT.md` changes belong to the prior workspace state and are excluded from this draft.
