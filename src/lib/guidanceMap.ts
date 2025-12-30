/**
 * Guidance Map - Translation Dictionary
 * 
 * Maps technical validation errors to user-friendly guidance entries.
 * Each entry provides context, explanation, and actionable remediation steps.
 */

export interface GuidanceEntry {
    issue: string;           // Human-readable issue title
    icon: string;            // Lucide icon name or emoji
    explanation: string;     // Why this blocks modeling
    fix: string;            // How to resolve it
    severity: "critical" | "warning" | "info";
}

/**
 * Static mapping of error strings to guidance entries
 */
export const GUIDANCE_MAP: Record<string, GuidanceEntry> = {
    // Target Variable Issues
    "target_variable: issue": {
        issue: "Missing Target Variable",
        icon: "Target",
        explanation: "I cannot predict future outcomes because this dataset is missing a clearly defined 'Target' column. Predictive modeling requires knowing what you want to predict (e.g., sales, churn, revenue).",
        fix: "Upload a dataset with a column that represents your desired outcome. Label it clearly (e.g., 'total_sales', 'customer_churn', 'revenue').",
        severity: "critical"
    },

    "target_variable: missing": {
        issue: "Target Column Not Found",
        icon: "Target",
        explanation: "The specified target variable does not exist in your dataset. I need this column to build predictive models.",
        fix: "Verify your target column name matches exactly (case-sensitive) or select a different column as your target.",
        severity: "critical"
    },

    // Variance Issues
    "variance: issue": {
        issue: "Insufficient Target Variance",
        icon: "TrendingFlat",
        explanation: "Your target variable has too little variation. For example, if 99% of rows have the same value, there's nothing to predict. Statistical models require diverse outcomes to learn patterns.",
        fix: "Review your target column. If most values are identical, consider: (1) collecting more diverse data, (2) redefining your target variable, or (3) filtering to a more varied subset.",
        severity: "critical"
    },

    "variance: low": {
        issue: "Low Data Variability",
        icon: "BarChart2",
        explanation: "Your dataset shows minimal variation across features. This makes it difficult to identify meaningful patterns or relationships.",
        fix: "Ensure your data includes diverse examples. Add more features or collect data across different time periods or segments.",
        severity: "warning"
    },

    // Missing Values
    "missing_values: critical": {
        issue: "Excessive Missing Data",
        icon: "AlertCircle",
        explanation: "More than 30% of your data contains missing values. This can severely impact model accuracy and reliability.",
        fix: "Clean your dataset by: (1) removing rows/columns with missing data, (2) filling gaps with appropriate values (mean, median, or forward-fill), or (3) collecting more complete data.",
        severity: "critical"
    },

    "missing_values: high": {
        issue: "High Missing Value Rate",
        icon: "AlertTriangle",
        explanation: "Your dataset contains a significant amount of missing values. While not critical, this may reduce model quality.",
        fix: "Consider imputing missing values or removing sparse columns before re-uploading.",
        severity: "warning"
    },

    // Data Density
    "data_density: issue": {
        issue: "Sparse Dataset",
        icon: "Database",
        explanation: "The data structure is too sparse for advanced algorithms. Most values are empty or zero, making pattern detection difficult.",
        fix: "Collect more complete data or focus on columns with higher data density. Remove columns that are mostly empty.",
        severity: "warning"
    },

    "data_density: low": {
        issue: "Insufficient Data Points",
        icon: "Layers",
        explanation: "Your dataset has too few rows relative to the number of features. Statistical models need adequate examples to learn.",
        fix: "Either collect more data rows or reduce the number of features (columns) you're analyzing.",
        severity: "warning"
    },

    // Time Series Issues
    "time_field: missing": {
        issue: "No Date/Time Column",
        icon: "Calendar",
        explanation: "Time-based forecasting requires a date or timestamp column. Without it, I cannot perform trend analysis or seasonality detection.",
        fix: "Add a column with dates or timestamps (e.g., 'date', 'timestamp', 'order_date'). Ensure it's in a standard date format.",
        severity: "info"
    },

    "time_series: insufficient": {
        issue: "Not Enough Time Periods",
        icon: "TrendingUp",
        explanation: "Forecasting requires at least 12-24 data points over time. Your dataset has too few time periods to detect trends or seasonal patterns.",
        fix: "Collect data over a longer time period. For monthly data, aim for at least 1-2 years of history.",
        severity: "warning"
    },

    // Categorical Issues
    "categorical: high_cardinality": {
        issue: "Too Many Unique Categories",
        icon: "Tag",
        explanation: "One or more categorical columns have excessive unique values (e.g., user IDs). This can cause model complexity and poor performance.",
        fix: "Group rare categories into 'Other' or remove high-cardinality ID columns that don't add predictive value.",
        severity: "info"
    },

    // Data Quality
    "data_quality: poor": {
        issue: "Overall Data Quality Issue",
        icon: "ShieldAlert",
        explanation: "Multiple data quality issues detected: missing values, duplicates, or inconsistent formatting.",
        fix: "Review your dataset for completeness and consistency. Use data validation tools before uploading.",
        severity: "warning"
    },

    "duplicates: high": {
        issue: "Duplicate Records Detected",
        icon: "Copy",
        explanation: "Your dataset contains many duplicate rows, which can skew analysis results.",
        fix: "Remove duplicate records before uploading. Keep only unique rows based on key identifiers.",
        severity: "info"
    },

    // Blocked Agents (from Screenshot 55)
    "blocked_agents: regression": {
        issue: "Regression Modeling Disabled",
        icon: "Lock",
        explanation: "Regression analysis is blocked due to data quality issues (typically missing target variable or insufficient variance).",
        fix: "Address the primary validation issues listed above to unlock regression capabilities.",
        severity: "critical"
    },

    "blocked_agents: clustering": {
        issue: "Clustering Disabled",
        icon: "Lock",
        explanation: "Customer segmentation and clustering are unavailable due to data sparsity or quality issues.",
        fix: "Ensure your dataset has sufficient complete records and feature variety.",
        severity: "warning"
    },
};

/**
 * Fallback guidance for unknown or unmatched errors
 */
export const FALLBACK_GUIDANCE: GuidanceEntry = {
    issue: "Data Quality Issue Detected",
    icon: "AlertTriangle",
    explanation: "The data structure is too sparse or incomplete for advanced algorithms. This often indicates missing values, low variance, or insufficient data points.",
    fix: "Review your dataset for missing values, ensure numeric columns have variation, and verify a clear target variable exists. Consider using data validation tools before uploading.",
    severity: "warning"
};
