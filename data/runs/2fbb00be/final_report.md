# ACE Customer Intelligence Report

## Run Metadata
- **Run ID:** `2fbb00be`
- **Generated:** 2026-01-01 20:48:44
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
Validation mode: insight (confidence: moderate). Dataset type: financial_accounting (exploratory confidence). The engine identified 5 behavioral segments.

## Validation & Guardrails
- **Mode:** insight
- **Validation Confidence:** moderate
- **Rows:** 500 | **Columns:** 5
- sample_size: ok (Rows=500, min_required=50)
- target_variable: ok (revenue)
- variance: ok (usable=500, std=692791.6319 unique=500)
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
| Numeric Features | 5 |
| Categorical Features | 0 |

**Key Insights:**
- 3 features show high variability

## Statistical Correlations

Found **2 significant relationships** between features.

### Top Feature Relationships

| Feature 1 | Feature 2 | Correlation | Strength | Direction |
| :--- | :--- | :--- | :--- | :--- |
| age | satisfaction | 0.868 | Very Strong | Positive |
| revenue | visits | 0.530 | Moderate | Positive |

**Insights:**
- Found 2 significant feature relationships
- Strongest relationship: age and satisfaction (positive, r=0.87)
- 1 strong positive correlations indicate features that increase together

## Distribution Analysis

Analyzed **5 numeric features** for statistical properties.

**Notable Distributions:**
- **revenue**: Highly skewed (right_skewed)
- **age**: Highly skewed (right_skewed)
- **visits**: Highly skewed (right_skewed)
- **satisfaction**: Highly skewed (right_skewed)

**Statistical Insights:**
- Analyzed 5 numeric features
- 4 features show significant skewness
- 1 features contain >5% outliers

## Behavioral Clusters
| Metric | Value |
| :--- | :--- |
| Optimal Clusters (k) | 5 |
| Silhouette Score | 0.9937204472732892 |
| Data Quality | 1.0 |

## Outcome Modeling
No regression results were produced.

## Business Intelligence

### Value Analysis

| Metric | Value |
| :--- | :--- |
| Total Value | $41,402,873.75 |
| Average Value | $82,805.75 |
| Median Value | $1,196.69 |
| Top 10% Threshold | $4,591.67 |
| Value Concentration (Gini) | 0.976 |

- Evidence: computed from `revenue` (sum/mean/quantiles).
### Customer Lifetime Value Proxy

- **Average Value per Record:** $82,805.75
- **High-Value Threshold:** $2,324.67
- **High-Value Customer Count:** 125

### Segment Value Contribution

| Segment | Total Value | Avg Value | Size | Contribution % |
| :--- | :--- | :--- | :--- | :--- |
| Cluster 1 | $17,529,069.37 | $8,764,534.69 | 2 | 42.3% |
| Cluster 3 | $11,224,293.27 | $5,612,146.64 | 2 | 27.1% |
| Cluster 2 | $7,982,080.28 | $2,660,693.43 | 3 | 19.3% |
| Cluster 4 | $3,691,715.64 | $1,230,571.88 | 3 | 8.9% |
| Cluster 0 | $975,715.19 | $1,991.26 | 490 | 2.4% |

- Evidence: segment value derived from `revenue` grouped by clusters.

### Churn Risk Analysis

- Risk definition: low activity in `visits` (<= 8.00) treated as churn proxy.
> [!WARNING]
> **171 records (34.2%) show low activity**
> These customers may be at risk of churn.

**Business Insights:**
- Total value: $41,402,873.75
- High value concentration - significant inequality in value distribution
- Top segment contributes 42.3% of total value
- Warning: 34.2% of records show low activity (churn risk)

## Predictive Feature Importance

**Target Variable:** `revenue` (regression)
**Model Performance (CV Score):** 0.000

### Top Predictive Features

| Rank | Feature | Importance |
| :--- | :--- | :--- |
| 0 | customer_id | 399.815 |
| 0 | age | 8344.486 |
| 0 | visits | 35.809 |
| 0 | satisfaction | 622.513 |

**Predictive Insights:**
- Top 3 features explain 878011.0% of revenue variance
- Most important feature: customer_id (39981.5% importance)

## Generated Personas & Strategies
No personas/strategies produced.
