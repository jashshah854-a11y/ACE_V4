# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `66785d98`
- **Generated:** 2026-01-01 20:32:33
- **Dataset Quality Score:** 0.94
- **Data Confidence:** 1.0 (high)

## Confidence & Governance
- Insights allowed by contract and validation gate.
- Limitations already logged:
  - regression blocked: Predictive modeling out of scope for this task contract
- Allowed sections: data_overview, eda, insights, modeling, quality

## Data Type Identification
- **Primary Type:** financial_accounting (confidence: exploratory)
- **Secondary Signals:** risk_compliance, mixed
- Primary type inferred from column/value signals (score=2).

**Domain Context:** unknown

## Executive Summary
Validation mode: insight (confidence: moderate). Dataset type: financial_accounting (exploratory confidence). The engine identified 3 behavioral segments.

## Validation & Guardrails
- **Mode:** insight
- **Validation Confidence:** moderate
- **Rows:** 1000 | **Columns:** 5
- sample_size: ok (Rows=1000, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=1000, std=973.7153 unique=1000)
- time_coverage: issue (No time field with coverage)
- causal_context: issue (No causal design detected; analysis treated as observational.)
- Time coverage unknown; treat any trend/forecasting as exploratory only.
- Dataset treated as observational; causal claims are prohibited.

## Data Quality Assessment

| Metric | Value |
| :--- | :--- |
| Overall Completeness | 100.0% |
| Total Records | 1,000 |
| Total Features | 5 |
| Numeric Features | 4 |
| Categorical Features | 1 |

**Key Insights:**
- 2 features show high variability

## Statistical Correlations

Found **1 significant relationships** between features.

### Top Feature Relationships

| Feature 1 | Feature 2 | Correlation | Strength | Direction |
| :--- | :--- | :--- | :--- | :--- |
| revenue | visits | 0.849 | Very Strong | Positive |

**Insights:**
- Found 1 significant feature relationships
- Strongest relationship: revenue and visits (positive, r=0.85)
- 1 strong positive correlations indicate features that increase together

## Distribution Analysis

Analyzed **4 numeric features** for statistical properties.

**Notable Distributions:**
- **revenue**: Highly skewed (right_skewed)
- **visits**: Highly skewed (right_skewed)
- **churn_risk**: Highly skewed (right_skewed)

**Statistical Insights:**
- Analyzed 4 numeric features
- 3 features show significant skewness
- 1 features contain >5% outliers

## Behavioral Clusters
| Metric | Value |
| :--- | :--- |
| Optimal Clusters (k) | 3 |
| Silhouette Score | 0.6190223421663001 |
| Data Quality | 0.94 |

## Outcome Modeling
No regression results were produced.

## Business Intelligence

### Value Analysis

| Metric | Value |
| :--- | :--- |
| Total Value | $196,208.15 |
| Average Value | $196.21 |
| Median Value | $100.81 |
| Top 10% Threshold | $127.68 |
| Value Concentration (Gini) | 0.539 |

- Evidence: computed from `revenue` (sum/mean/quantiles).
### Customer Lifetime Value Proxy

- **Average Value per Record:** $196.21
- **High-Value Threshold:** $113.52
- **High-Value Customer Count:** 250

### Segment Value Contribution

| Segment | Total Value | Avg Value | Size | Contribution % |
| :--- | :--- | :--- | :--- | :--- |
| Cluster 1 | $96,789.40 | $9,678.94 | 10 | 49.3% |
| Cluster 0 | $49,817.36 | $100.24 | 497 | 25.4% |
| Cluster 2 | $49,601.39 | $100.61 | 493 | 25.3% |

- Evidence: segment value derived from `revenue` grouped by clusters.

### Churn Risk Analysis

- Risk definition: low activity in `visits` (<= 3.00) treated as churn proxy.
> [!WARNING]
> **251 records (25.1%) show low activity**
> These customers may be at risk of churn.

**Business Insights:**
- Total value: $196,208.15
- High value concentration - significant inequality in value distribution
- Top segment contributes 49.3% of total value
- Warning: 25.1% of records show low activity (churn risk)

## Predictive Feature Importance

**Target Variable:** `revenue` (regression)
**Model Performance (CV Score):** 0.000

### Top Predictive Features

| Rank | Feature | Importance |
| :--- | :--- | :--- |
| 0 | customer_id | 0.152 |
| 0 | visits | 163.652 |
| 0 | churn_risk | 3.601 |

**Predictive Insights:**
- Top 3 features explain 16740.5% of revenue variance
- Most important feature: customer_id (15.2% importance)

## Generated Personas & Strategies
No personas/strategies produced.
