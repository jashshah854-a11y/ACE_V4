# Timebox Execution Expectation

Purpose
- This note is a reminder for future runs: follow the full 60-minute wall-clock timebox exactly, with explicit phase timing and time-stamped logging.

Required Timing (Strict)
- 5 minutes: Preflight
- 25 minutes: Integration tests
- 15 minutes: Synthetic load tests
- 10 minutes: Chaos tests
- 5 minutes: Report and summary

Execution Requirements
- Record start and end timestamps for each phase.
- If a phase finishes early, continue with expanded checks in-scope until the phase timebox ends.
- Preserve all artifacts and include evidence links in the report.
- Follow context checkpoint rule if context drops to ~20 percent.

Non-Negotiables
- Do not change production defaults.
- Do not add user-facing behavior.
- Do not expand tracking surface.
- Only add tests, fixtures, and minimal test utilities.
