import { ExplanationBlockProps } from "@/components/report/ExplanationBlock";

/**
 * Section Copy Registry
 * 
 * Central source of truth for section explanations.
 * Supports token replacement for dynamic content.
 * 
 * Usage:
 * const copy = getSectionCopy("drivers", { targetVariable: "Revenue" });
 */

interface SectionCopyEntry {
    what: string;
    shows: string;
    why: string;
    how?: string;
    notes?: string;
    limits?: string;
}

export const SECTION_COPY: Record<string, SectionCopyEntry> = {
    // Feature Importance / Drivers
    drivers: {
        what: "The statistical features most strongly associated with {targetVariable}",
        shows: "Which data points have the highest predictive power in explaining outcomes",
        why: "Focus analysis and action on the factors that matter most for {targetVariable}",
        how: "Features are ranked by importance score (0-100). Higher bars indicate stronger influence.",
        notes: "Importance is derived from {model_type} analysis with {sample_size} records",
    },

    // Correlation Analysis
    correlations: {
        what: "Statistical relationships between pairs of numeric variables",
        shows: "Which metrics move together (positive correlation) or oppose each other (negative correlation)",
        why: "Identify hidden patterns and validate assumptions about how metrics relate",
        how: "Heatmap cells show correlation strength from -1 (perfect negative) to +1 (perfect positive). Darker colors indicate stronger relationships.",
        limits: "Correlation does not imply causation. Strong correlations may be coincidental.",
    },

    // Clustering / Segments
    segments: {
        what: "Naturally occurring groups in your data with distinct characteristics",
        shows: "How records cluster into segments based on behavioral or attribute patterns",
        why: "Tailor strategies to different audience groups rather than one-size-fits-all approaches",
        how: "Each segment is sized by number of records and labeled by defining characteristics. Look for distinct patterns across segments.",
        notes: "Segments identified using {clustering_method} with {num_features} features",
    },

    // Distribution Analysis
    distribution: {
        what: "How values are spread across the range of {variable_name}",
        shows: "Concentration, outliers, and typical ranges for this metric",
        why: "Understand what 'normal' looks like and identify unusual cases that need attention",
        how: "Histogram bars show count of records in each value range. Taller bars indicate more common values.",
    },

    // Time Trends
    trends: {
        what: "How {metric_name} has changed over {time_period}",
        shows: "Directional movement, volatility, and inflection points",
        why: "Spot emerging patterns early and track if changes persist or reverse",
        notes: "Data spans {date_range} with {num_observations} observations",
        limits: "Past trends do not guarantee future performance",
    },

    // Business Intelligence
    business_value: {
        what: "Revenue, customer value, or business outcome metrics from your data",
        shows: "Total value, concentration, high-value segments, and at-risk indicators",
        why: "Quantify business impact and prioritize where to invest resources",
        notes: "Value calculated from {value_column}. Segments are based on {segmentation_method}.",
    },

    // Data Quality
    data_quality: {
        what: "Completeness, consistency, and reliability of your dataset",
        shows: "Missing values, data coverage, and validation status",
        why: "Trust insights only when data quality meets minimum thresholds",
        limits: "Some analyses are blocked when quality falls below {quality_threshold}%",
    },

    // Validation Summary
    validation: {
        what: "Checks performed to ensure data and analysis meet quality standards",
        shows: "Which validation rules passed, which failed, and why",
        why: "Prevent bad decisions based on flawed or incomplete data",
    },

    // Scenario Comparison
    scenarios: {
        what: "Side-by-side comparison of different 'what-if' conditions",
        shows: "How outcomes change when you adjust input variables",
        why: "Model decisions before committing resources to a strategy",
        notes: "Scenarios use {model_name} trained on {training_sample_size} records",
        limits: "Predictions are estimates with confidence intervals. Real outcomes may vary.",
    },

    // Anomalies
    anomalies: {
        what: "Records that deviate significantly from expected patterns",
        shows: "Outliers detected by statistical methods",
        why: "Investigate unusual cases that may represent errors, fraud, or unique opportunities",
        how: "Anomalies are flagged when values exceed {threshold} standard deviations from the mean",
    },

    // Evidence Rail
    evidence: {
        what: "Technical details on how each analysis was performed",
        shows: "Methods, data sources, sample sizes, and confidence levels",
        why: "Audit and validate findings with transparency into the analysis process",
    },
};

/**
 * Get section copy with token replacement
 */
export function getSectionCopy(
    sectionId: string,
    tokens: Record<string, string> = {}
): ExplanationBlockProps {
    const template = SECTION_COPY[sectionId];

    if (!template) {
        // Fallback for unknown sections
        return {
            what: "An analysis component",
            shows: "Data insights from your dataset",
            why: "Provides context for decision-making",
            tokens,
        };
    }

    return {
        ...template,
        tokens,
    };
}

/**
 * Get available section IDs
 */
export function getAvailableSections(): string[] {
    return Object.keys(SECTION_COPY);
}
