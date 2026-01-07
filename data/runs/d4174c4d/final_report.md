# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `d4174c4d`
- **Generated:** 2026-01-01 20:31:42
- **Dataset Quality Score:** 0.82
- **Data Confidence:** 1.0 (high)

## Confidence & Governance
- Insights allowed by contract and validation gate.
- Limitations already logged:
  - regression blocked: Predictive modeling out of scope for this task contract
- Allowed sections: data_overview, eda, insights, modeling, quality

## Data Type Identification
- **Primary Type:** financial_accounting (confidence: exploratory)
- **Secondary Signals:** mixed
- Primary type inferred from column/value signals (score=2).

**Domain Context:** unknown

## Executive Summary
Validation mode: insight (confidence: moderate). Dataset type: financial_accounting (exploratory confidence). The engine identified 3 behavioral segments.

## Validation & Guardrails
- **Mode:** insight
- **Validation Confidence:** moderate
- **Rows:** 500 | **Columns:** 5
- sample_size: ok (Rows=500, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=500, std=9057.2918 unique=500)
- time_coverage: issue (No time field with coverage)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Time coverage unknown; treat any trend/forecasting as exploratory only.
- Dataset treated as observational; causal claims are prohibited.

## Data Quality Assessment

| Metric | Value |
| :--- | :--- |
| Overall Completeness | 100.0% |
| Total Records | 500 |
| Total Features | 5 |
| Numeric Features | 2 |
| Categorical Features | 3 |

**Key Insights:**
- 1 features show high variability

## Statistical Correlations

**Insights:**
- No strong correlations detected between features

## Distribution Analysis

Analyzed **2 numeric features** for statistical properties.

**Notable Distributions:**
- **revenue**: Highly skewed (right_skewed)

**Statistical Insights:**
- Analyzed 2 numeric features
- 1 features show significant skewness
- 1 features contain >5% outliers

## Behavioral Clusters
| Metric | Value |
| :--- | :--- |
| Optimal Clusters (k) | 3 |
| Silhouette Score | 0.887832776656489 |
| Data Quality | 0.82 |

## Outcome Modeling
No regression results were produced.

## Business Intelligence

### Value Analysis

| Metric | Value |
| :--- | :--- |
| Total Value | $1,605,603.86 |
| Average Value | $3,211.21 |
| Median Value | $1,049.19 |
| Top 10% Threshold | $6,249.10 |
| Value Concentration (Gini) | 0.713 |

- Evidence: computed from `revenue` (sum/mean/quantiles).
### Customer Lifetime Value Proxy

- **Average Value per Record:** $3,211.21
- **High-Value Threshold:** $2,787.84
- **High-Value Customer Count:** 125

### Segment Value Contribution

| Segment | Total Value | Avg Value | Size | Contribution % |
| :--- | :--- | :--- | :--- | :--- |
| Cluster 0 | $930,123.37 | $1,933.73 | 481 | 57.9% |
| Cluster 2 | $521,823.25 | $28,990.18 | 18 | 32.5% |
| Cluster 1 | $153,657.24 | $153,657.24 | 1 | 9.6% |

- Evidence: segment value derived from `revenue` grouped by clusters.

**Business Insights:**
- Total value: $1,605,603.86
- High value concentration - significant inequality in value distribution
- Top segment contributes 57.9% of total value

## Predictive Feature Importance

**Target Variable:** `revenue` (regression)
**Model Performance (CV Score):** 0.000

### Top Predictive Features

| Rank | Feature | Importance |
| :--- | :--- | :--- |
| 0 | customer_id | 0.482 |

**Predictive Insights:**
- Top 3 features explain 48.2% of revenue variance
- Most important feature: customer_id (48.2% importance)

## Generated Personas & Strategies
No personas/strategies produced.
