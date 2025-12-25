# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `fe82fcdb`
- **Generated:** 2025-12-22 14:47:29
- **Dataset Quality Score:** 1.0
- **Data Confidence:** 0.6 (moderate)

## Confidence & Governance
- Insights allowed by contract and validation gate.
- Confidence reasons:
  - Target variance insufficient.
- Allowed sections: clustering, data_overview, eda, insights, quality

## Data Type Identification
- **Primary Type:** marketing_performance (confidence: exploratory)
- Primary type inferred from column/value signals (score=2).

> [!WARNING]
> **Fallback Mode Active**
> Some parts of the engine ran in fallback mode due to missing schema or insufficient feature depth.
> ACE automatically switched to backup intelligence.

**Domain Context:** unknown

## Executive Summary
Validation mode: limitations (confidence: exploratory). Certain agents were skipped due to insufficient evidence: fabricator, regression Dataset type: marketing_performance (exploratory confidence). The engine identified 1 behavioral segments.

## Validation & Guardrails
- **Mode:** limitations
- **Validation Confidence:** exploratory
- **Rows:** 100000 | **Columns:** 5
- **Blocked Agents:** fabricator, regression
- sample_size: ok (Rows=100000, min_required=50)
- target_variable: issue (Not found)
- variance: issue (No target to assess)
- time_coverage: issue (No time field with coverage)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- No suitable target variable detected; regression and strategy generation will be skipped.
- Time coverage unknown; treat any trend/forecasting as exploratory only.
- Dataset treated as observational; causal claims are prohibited.

## Limitations & Diagnostics
- Validation in limitation mode; only diagnostics are shown.
- Confidence driver: Target variance insufficient.

## Behavioral Clusters
Suppressed due to confidence/contract/validation gates.

## Outcome Modeling
Outcome modeling suppressed due to confidence/contract/validation gates.

## Generated Personas & Strategies
Personas and strategies suppressed due to confidence/contract/validation gates.

## Anomaly Detection
**Total Anomalies Detected:** 0
