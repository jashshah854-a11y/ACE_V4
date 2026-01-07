# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `91ea538d`
- **Generated:** 2026-01-01 20:42:34
- **Dataset Quality Score:** 1.0
- **Data Confidence:** 1.0 (high)

## Confidence & Governance
- Insights allowed by contract and validation gate.
- Limitations already logged:
  - regression blocked: Predictive modeling out of scope for this task contract
- Allowed sections: data_overview, eda, insights, modeling, quality

## Data Type Identification
- **Primary Type:** financial_accounting (confidence: exploratory)
- **Secondary Signals:** customer_behavior
- Primary type inferred from column/value signals (score=2).

**Domain Context:** unknown

## Executive Summary
Validation mode: insight (confidence: moderate). Dataset type: financial_accounting (exploratory confidence). The engine identified 3 behavioral segments.

## Validation & Guardrails
- **Mode:** insight
- **Validation Confidence:** moderate
- **Rows:** 500 | **Columns:** 8
- sample_size: ok (Rows=500, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=500, std=966.0802 unique=500)
- time_coverage: issue (No time field with coverage)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Time coverage unknown; treat any trend/forecasting as exploratory only.
- Dataset treated as observational; causal claims are prohibited.

## Data Quality Assessment

| Metric | Value |
| :--- | :--- |
| Overall Completeness | 100.0% |
| Total Records | 500 |
| Total Features | 8 |
| Numeric Features | 8 |
| Categorical Features | 0 |

## Statistical Correlations

Found **10 significant relationships** between features.

### Top Feature Relationships

| Feature 1 | Feature 2 | Correlation | Strength | Direction |
| :--- | :--- | :--- | :--- | :--- |
| revenue_scaled | revenue_inverse | -1.000 | Very Strong | Negative |
| revenue | revenue_scaled | 1.000 | Very Strong | Positive |
| revenue_copy_1 | revenue_scaled | 1.000 | Very Strong | Positive |
| revenue_copy_2 | revenue_scaled | 1.000 | Very Strong | Positive |
| revenue | revenue_copy_1 | 1.000 | Very Strong | Positive |
| revenue | revenue_copy_2 | 1.000 | Very Strong | Positive |
| revenue | revenue_inverse | -1.000 | Very Strong | Negative |
| revenue_copy_1 | revenue_copy_2 | 1.000 | Very Strong | Positive |
| revenue_copy_1 | revenue_inverse | -1.000 | Very Strong | Negative |
| revenue_copy_2 | revenue_inverse | -1.000 | Very Strong | Negative |

**Insights:**
- Found 10 significant feature relationships
- Strongest relationship: revenue_scaled and revenue_inverse (negative, r=-1.00)
- 6 strong positive correlations indicate features that increase together
- 4 strong negative correlations indicate inverse relationships

## Distribution Analysis

Analyzed **8 numeric features** for statistical properties.

**Statistical Insights:**
- Analyzed 8 numeric features
- 5 features follow normal distribution

## Behavioral Clusters
| Metric | Value |
| :--- | :--- |
| Optimal Clusters (k) | 3 |
| Silhouette Score | 0.5155420520105787 |
| Data Quality | 1.0 |

## Outcome Modeling
No regression results were produced.

## Business Intelligence

### Value Analysis

| Metric | Value |
| :--- | :--- |
| Total Value | $2,491,579.76 |
| Average Value | $4,983.16 |
| Median Value | $4,929.33 |
| Top 10% Threshold | $6,279.95 |
| Value Concentration (Gini) | 0.110 |

- Evidence: computed from `revenue` (sum/mean/quantiles).
### Customer Lifetime Value Proxy

- **Average Value per Record:** $4,983.16
- **High-Value Threshold:** $5,628.43
- **High-Value Customer Count:** 125

### Segment Value Contribution

| Segment | Total Value | Avg Value | Size | Contribution % |
| :--- | :--- | :--- | :--- | :--- |
| Cluster 0 | $1,124,177.48 | $4,974.24 | 226 | 45.1% |
| Cluster 1 | $835,582.22 | $6,189.50 | 135 | 33.5% |
| Cluster 2 | $531,820.06 | $3,826.04 | 139 | 21.3% |

- Evidence: segment value derived from `revenue` grouped by clusters.

### Churn Risk Analysis

- Risk definition: low activity in `visits` (<= 8.00) treated as churn proxy.
> [!WARNING]
> **176 records (35.2%) show low activity**
> These customers may be at risk of churn.

**Business Insights:**
- Total value: $2,491,579.76
- Top segment contributes 45.1% of total value
- Warning: 35.2% of records show low activity (churn risk)

## Predictive Feature Importance

**Target Variable:** `revenue` (regression)
**Model Performance (CV Score):** 0.000

### Top Predictive Features

| Rank | Feature | Importance |
| :--- | :--- | :--- |
| 0 | customer_id | 0.000 |
| 0 | revenue_copy_1 | 0.332 |
| 0 | revenue_copy_2 | 0.332 |
| 0 | revenue_scaled | 0.033 |
| 0 | revenue_inverse | 0.332 |
| 0 | visits | 0.000 |
| 0 | satisfaction | 0.000 |

**Predictive Insights:**
- Top 3 features explain 66.4% of revenue variance
- Most important feature: customer_id (0.0% importance)
- Remaining 2 features contribute 0.0%

## Generated Personas & Strategies
No personas/strategies produced.
