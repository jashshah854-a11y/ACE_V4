# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `92c70a02`
- **Generated:** 2026-01-01 20:46:13
- **Dataset Quality Score:** N/A
- **Data Confidence:** 0.1 (low)

## Confidence & Governance
> [!WARNING]
> Confidence is essentially zero; all rankings, risk labels, personas, and strategies are suppressed.
- Confidence reasons:
  - High null rate in at least one column.
  - Blocking drift detected.
- Allowed sections: data_overview, quality

## Data Type Identification
- **Primary Type:** time_series_trends (confidence: moderate)
- Primary type inferred from column/value signals (score=6).

**Domain Context:** unknown

## Executive Summary
Validation mode: limitations (confidence: high). Certain agents were skipped due to insufficient evidence: fabricator, overseer, personas, regression Dataset type: time_series_trends (moderate confidence).

## Validation & Guardrails
- **Mode:** limitations
- **Validation Confidence:** high
- **Rows:** 400 | **Columns:** 7
- **Blocked Agents:** fabricator, overseer, personas, regression
- sample_size: ok (Rows=400, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=165, std=21759.3453 unique=165)
- time_coverage: ok (399.0 days)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Dataset treated as observational; causal claims are prohibited.
- Profile/sample drift at block level; insights disabled.

## Limitations & Diagnostics
- Insights withheld: data confidence below cutoff.
- Validation in limitation mode; only diagnostics are shown.
- Task contract or validation forbids insights.
- Confidence driver: High null rate in at least one column.
- Confidence driver: Blocking drift detected.

## Behavioral Clusters
Suppressed due to confidence/contract/validation gates.

## Outcome Modeling
Outcome modeling suppressed due to confidence/contract/validation gates.

## Generated Personas & Strategies
Personas and strategies suppressed due to confidence/contract/validation gates.
