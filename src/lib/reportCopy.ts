import { ExplanationBlockProps } from "@/components/report/ExplanationBlock";

/**
 * Section Copy Registry
 * 
 * AUTHORITY RULES:
 * - ExplanationBlock is TIMELESS - explains what the section IS and WHY it exists
 * - InsightCaption is TEMPORAL - explains what the data is DOING right now
 * - NEVER reference current dominance, variance, or specific metrics in ExplanationBlock
 * - ExplanationBlock must read correctly even if data changes completely
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
        what: "Statistical ranking of features by their association with outcomes",
        shows: "Which variables explain the most variation in {targetVariable}",
        why: "Identify where effort and resources will have maximum impact",
        how: "Features ranked by importance score. Higher scores indicate stronger explanatory power.",
        notes: "Analysis method: {model_type} with {sample_size} records",
    },

    // Correlation Analysis
    correlations: {
        what: "Pairwise statistical relationships between numeric variables",
        shows: "Which metrics move in the same direction (positive) or opposite directions (negative)",
        why: "Discover hidden patterns and validate assumptions about metric relationships",
        how: "Correlation values range from -1 (perfect opposite) to +1 (perfect together). Zero means no linear relationship.",
        limits: "Correlation measures association, not causation. Strong correlations may be coincidental.",
    },

    // Clustering / Segments
    segments: {
        what: "Groups of similar records based on behavioral or attribute patterns",
        shows: "How the dataset naturally divides into distinct segments",
        why: "Enable targeted strategies instead of one-size-fits-all approaches",
        how: "Segments are defined by clustering algorithms that find natural groupings in multi-dimensional space.",
        notes: "Method: {clustering_method} using {num_features} features",
    },

    // Distribution Analysis
    distribution: {
        what: "The spread of values across the full range of {variable_name}",
        shows: "Where values concentrate, where gaps exist, and where outliers appear",
        why: "Understand typical ranges and identify unusual cases requiring investigation",
        how: "Bars represent count of records in each range. Height shows frequency.",
    },

    // Time Trends
    trends: {
        what: "Changes in {metric_name} tracked across {time_period}",
        shows: "Direction, volatility, and turning points over time",
        why: "Spot emerging patterns and assess whether changes are temporary or sustained",
        notes: "Timespan: {date_range} ({num_observations} observations)",
        limits: "Historical patterns do not guarantee future behavior.",
    },

    // Business Intelligence
    business_value: {
        what: "Economic metrics derived from your dataset",
        shows: "Total value, concentration patterns, and segment contributions",
        why: "Quantify impact and prioritize resource allocation by value potential",
        notes: "Value source: {value_column}, segmentation method: {segmentation_method}",
    },

    // Data Quality
    data_quality: {
        what: "Assessment of dataset completeness and consistency",
        shows: "Missing values, coverage gaps, and validation results",
        why: "Establish reliability before trusting conclusions",
        limits: "Quality below {quality_threshold}% blocks certain analyses",
    },

    // Validation Summary
    validation: {
        what: "Quality checks applied to data and analysis methods",
        shows: "Which rules passed, which failed, and specific issues found",
        why: "Prevent decisions based on flawed data or unreliable methods",
    },

    // Scenario Comparison
    scenarios: {
        what: "Simulated outcomes under different input conditions",
        shows: "How changes to variables affect predicted results",
        why: "Test strategies before real-world commitment",
        notes: "Model: {model_name}, training size: {training_sample_size}",
        limits: "Estimates include uncertainty. Actual results may differ.",
    },

    // Anomalies
    anomalies: {
        what: "Records with values outside expected statistical ranges",
        shows: "Outliers detected by deviation from typical patterns",
        why: "Flag errors, fraud, or exceptional cases requiring review",
        how: "Flagged when deviation exceeds {threshold} standard deviations",
    },

    // Evidence Rail
    evidence: {
        what: "Technical documentation of analysis methods and data sources",
        shows: "Algorithms used, parameters applied, and confidence assessments",
        why: "Enable audit trails and method validation",
    },

    // Governing Thought (NEW)
    governing_thought: {
        what: "The single most important conclusion synthesized from all analysis",
        shows: "A decision-ready thesis that frames the entire report",
        why: "Anchor interpretation and prevent getting lost in individual metrics",
        how: "Derived from pattern convergence, signal strength, and strategic relevance.",
        notes: "This shapes how all other insights should be interpreted.",
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
            shows: "Patterns discovered in your dataset",
            why: "Provide context for interpretation",
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
