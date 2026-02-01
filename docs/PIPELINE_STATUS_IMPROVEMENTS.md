# Executive Pulse & Anti-Dashboard Guardrails

- Added the `ExecutivePulse` route (`/report/summary`) with a one-page cap (1080px) that auto-collapses lower-importance narrative sections into an Appendices accordion.
- Introduced `InsightBlock`, `ConfidenceBadge`, `LimitationBanner`, and `ScopeLockModal` so visuals only render when paired with narrative text plus evidence IDs.
- Navigation now surfaces the active Task Contract question and scope-locked drills raise an explicit modal before fetching evidence.
- Overseer intake switched to a structured form (decision, success criteria, constraints) and blocks vague submissions before the pipeline starts.
- Forecast visualizations now show fog-of-war bands plus literal gaps for missing data; confidence badges accompany every highlighted metric.
