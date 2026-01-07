# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `2b1f142c`
- **Generated:** 2026-01-01 20:50:58
- **Dataset Quality Score:** N/A
- **Data Confidence:** 0.4 (low)

## Confidence & Governance
> [!WARNING]
> Confidence is essentially zero; all rankings, risk labels, personas, and strategies are suppressed.
- Confidence reasons:
  - Blocking drift detected.
- Allowed sections: data_overview, quality

## Data Type Identification
- **Primary Type:** time_series_trends (confidence: exploratory)
- **Secondary Signals:** financial_accounting, marketing_performance
- Primary type inferred from column/value signals (score=4).

**Domain Context:** unknown

## Executive Summary
Validation mode: limitations (confidence: high). Certain agents were skipped due to insufficient evidence: fabricator, overseer, personas, regression Dataset type: time_series_trends (exploratory confidence).

## Validation & Guardrails
- **Mode:** limitations
- **Validation Confidence:** high
- **Rows:** 1000 | **Columns:** 4
- **Blocked Agents:** fabricator, overseer, personas, regression
- sample_size: ok (Rows=1000, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=1000, std=381.1359 unique=907)
- time_coverage: ok (999.0 days)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Dataset treated as observational; causal claims are prohibited.
- Profile/sample drift at block level; insights disabled.

## Limitations & Diagnostics
- Insights withheld: data confidence below cutoff.
- Validation in limitation mode; only diagnostics are shown.
- Task contract or validation forbids insights.
- Confidence driver: Blocking drift detected.

## Behavioral Clusters
Suppressed due to confidence/contract/validation gates.

## Outcome Modeling
Outcome modeling suppressed due to confidence/contract/validation gates.

## Generated Personas & Strategies
Personas and strategies suppressed due to confidence/contract/validation gates.
