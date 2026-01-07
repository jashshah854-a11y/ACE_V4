# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `3ef40f11`
- **Generated:** 2026-01-01 20:44:40
- **Dataset Quality Score:** 0.871
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
- **Rows:** 300 | **Columns:** 7
- sample_size: ok (Rows=300, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=300, std=43975.8982 unique=300)
- time_coverage: issue (No time field with coverage)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Time coverage unknown; treat any trend/forecasting as exploratory only.
- Dataset treated as observational; causal claims are prohibited.

## Data Quality Assessment

| Metric | Value |
| :--- | :--- |
| Overall Completeness | 100.0% |
| Total Records | 300 |
| Total Features | 7 |
| Numeric Features | 4 |
| Categorical Features | 3 |

**Key Insights:**
- 1 features show high variability

## Statistical Correlations

**Insights:**
- No strong correlations detected between features

## Distribution Analysis

Analyzed **4 numeric features** for statistical properties.

**Notable Distributions:**
- **revenue**: Highly skewed (right_skewed)

**Statistical Insights:**
- Analyzed 4 numeric features
- 1 features follow normal distribution
- 1 features show significant skewness
- 1 features contain >5% outliers

## Behavioral Clusters
| Metric | Value |
| :--- | :--- |
| Optimal Clusters (k) | 3 |
| Silhouette Score | 0.9139645062828046 |
| Data Quality | 0.871 |

## Outcome Modeling
No regression results were produced.

## Business Intelligence

### Value Analysis

| Metric | Value |
| :--- | :--- |
| Total Value | $1,761,119.27 |
| Average Value | $5,870.40 |
| Median Value | $1,063.53 |
| Top 10% Threshold | $7,382.39 |
| Value Concentration (Gini) | 0.822 |

- Evidence: computed from `revenue` (sum/mean/quantiles).
### Customer Lifetime Value Proxy

- **Average Value per Record:** $5,870.40
- **High-Value Threshold:** $3,265.68
- **High-Value Customer Count:** 75

### Segment Value Contribution

| Segment | Total Value | Avg Value | Size | Contribution % |
| :--- | :--- | :--- | :--- | :--- |
| Cluster 0 | $756,377.68 | $2,572.71 | 294 | 42.9% |
| Cluster 1 | $755,304.90 | $755,304.90 | 1 | 42.9% |
| Cluster 2 | $249,436.68 | $49,887.34 | 5 | 14.2% |

- Evidence: segment value derived from `revenue` grouped by clusters.

### Churn Risk Analysis

- Risk definition: low activity in `visits` (<= 6.00) treated as churn proxy.
> [!WARNING]
> **86 records (28.7%) show low activity**
> These customers may be at risk of churn.

**Business Insights:**
- Total value: $1,761,119.27
- High value concentration - significant inequality in value distribution
- Top segment contributes 42.9% of total value
- Warning: 28.7% of records show low activity (churn risk)

## Predictive Feature Importance

**Target Variable:** `revenue` (regression)
**Model Performance (CV Score):** 0.000

### Top Predictive Features

| Rank | Feature | Importance |
| :--- | :--- | :--- |
| 0 | customer_id | 45.789 |
| 0 | constant_1 | 0.000 |
| 0 | visits | 207.543 |

**Predictive Insights:**
- Top 3 features explain 25333.2% of revenue variance
- Most important feature: customer_id (4578.9% importance)

## Generated Personas & Strategies
No personas/strategies produced.
