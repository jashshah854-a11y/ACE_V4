# ACE V4 Release Candidate v4.0.0-rc.1

## Overview
Exploratory Intelligence Mode is now a first class success path.
Descriptive insights remain visible without targets.
Scope constraints are explained calmly without confidence collapse.

## Completed PRs
PR 1 Analysis intent classification and diagnostics foundation
PR 2 Agent eligibility matrix with NOT_APPLICABLE semantics
PR 3 UI and narrative modulation for exploratory runs

## Known issues
Frontend test suite blocked on Windows due to esbuild EPERM spawn error caused by AV or Controlled Folder Access.
Tests pass in environments where esbuild is unblocked or run elevated.
No code level failures identified.

## Guardrails
No agent behavior changes beyond eligibility.
No confidence math changes.
Safe mode reserved for real governance violations only.
