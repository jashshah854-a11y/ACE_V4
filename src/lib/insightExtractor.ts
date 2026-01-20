import type { EnhancedAnalyticsData } from "@/types/reportTypes";

/**
 * Insight Extraction - Automatic caption and watch item generation
 * 
 * Analyzes data patterns and generates plain-language insights
 */

export interface ExtractedInsight {
    text: string;
    severity: "positive" | "neutral" | "warning" | "risk";
    confidence?: number;
    watchItem?: string;
}

/**
 * Extract insight from feature importance data
 */
export function extractDriverInsight(
    data: EnhancedAnalyticsData["feature_importance"]
): ExtractedInsight | null {
    if (!data?.available || !data.feature_importance?.length) {
        return null;
    }

    const topDriver = data.feature_importance[0];
    const topImportance = topDriver?.importance || 0;
    const secondImportance = data.feature_importance[1]?.importance || 0;

    // Check if one feature dominates
    if (topImportance > secondImportance * 2) {
        return {
            text: `${topDriver.feature} dominates with ${Math.round(topImportance)}% importance—focus improvements here for maximum impact.`,
            severity: "positive",
            confidence: data.confidence,
            watchItem: `Monitor ${topDriver.feature} closely as changes here will significantly affect ${data.target || "outcomes"}.`,
        };
    }

    // Balanced importance
    const topThree = data.feature_importance.slice(0, 3).map((f) => f.feature).join(", ");
    return {
        text: `Multiple drivers (${topThree}) show similar importance—consider multi-factor strategies.`,
        severity: "neutral",
        confidence: data.confidence,
    };
}

/**
 * Extract insight from correlation data
 */
export function extractCorrelationInsight(
    data: EnhancedAnalyticsData["correlation_analysis"]
): ExtractedInsight | null {
    if (!data?.available || !data.strong_correlations?.length) {
        return null;
    }

    const strongestCorr = data.strong_correlations[0];
    const strength = Math.abs(strongestCorr.pearson);

    if (strength > 0.8) {
        return {
            text: `Very strong ${strongestCorr.direction} correlation (${strength.toFixed(2)}) between ${strongestCorr.feature1} and ${strongestCorr.feature2}.`,
            severity: "warning",
            watchItem: "High correlation may indicate redundancy or confounding—investigate causality.",
        };
    }

    if (strength > 0.5) {
        return {
            text: `Moderate correlation detected: ${strongestCorr.feature1} and ${strongestCorr.feature2} move ${strongestCorr.direction === "positive" ? "together" : "oppositely"}.`,
            severity: "neutral",
        };
    }

    return {
        text: `${data.total_correlations} moderate relationships found—patterns exist but are not overly strong.`,
        severity: "neutral",
    };
}

/**
 * Extract insight from distribution data
 */
export function extractDistributionInsight(
    columnName: string,
    stats: { min: number; max: number; mean: number; std: number; median: number }
): ExtractedInsight | null {
    const range = stats.max - stats.min;
    const cov = stats.std / Math.abs(stats.mean || 1); // Coefficient of variation

    // High variability
    if (cov > 1.0) {
        return {
            text: `${columnName} shows high variance (CV=${cov.toFixed(1)})—consider segmentation or outlier treatment.`,
            severity: "warning",
        };
    }

    // Skewed distribution
    const skew = Math.abs(stats.mean - stats.median) / (stats.std || 1);
    if (skew > 0.5) {
        return {
            text: `${columnName} is skewed (mean=${stats.mean.toFixed(1)}, median=${stats.median.toFixed(1)})—typical cases differ from average.`,
            severity: "neutral",
            watchItem: "Skewed distributions may benefit from log transformation or non-parametric methods.",
        };
    }

    // Normal-ish
    return {
        text: `${columnName} shows relatively normal distribution with mean ${stats.mean.toFixed(1)} and range ${range.toFixed(1)}.`,
        severity: "neutral",
    };
}

/**
 * Extract insight from segment/cluster data
 */
export function extractSegmentInsight(
    segments: Array<{ label?: string; size?: number; avgValue?: number }>
): ExtractedInsight | null {
    if (!segments.length) return null;

    const totalSize = segments.reduce((sum, s) => sum + (s.size || 0), 0);
    const largestSegment = segments.reduce((max, s) =>
        (s.size || 0) > (max.size || 0) ? s : max
        , segments[0]);

    const largestPct = ((largestSegment.size || 0) / totalSize) * 100;

    // One dominant segment
    if (largestPct > 50) {
        return {
            text: `${largestSegment.label || "Largest segment"} represents ${largestPct.toFixed(0)}% of records—strategies should prioritize this group.`,
            severity: "positive",
        };
    }

    // Balanced segments
    if (segments.length >= 3) {
        return {
            text: `${segments.length} distinct segments identified—each group needs tailored approach.`,
            severity: "neutral",
            watchItem: "Segment-specific targeting can improve conversion rates by 20-40%.",
        };
    }

    return {
        text: `${segments.length} segments found with relatively balanced distribution.`,
        severity: "neutral",
    };
}

/**
 * Detect anomalies in data
 */
export function extractAnomalyInsight(
    values: number[]
): ExtractedInsight | null {
    if (values.length < 10) return null;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
    );

    const outliers = values.filter((v) => Math.abs(v - mean) > 3 * std);

    if (outliers.length === 0) {
        return {
            text: "No statistical outliers detected—data appears consistent.",
            severity: "positive",
        };
    }

    const outlierPct = (outliers.length / values.length) * 100;

    if (outlierPct > 5) {
        return {
            text: `${outlierPct.toFixed(1)}% of values are outliers (>3σ)—investigate data quality or consider robust methods.`,
            severity: "warning",
            watchItem: "High outlier rate may indicate data errors, fraud, or need for separate handling.",
        };
    }

    return {
        text: `${outliers.length} outliers detected (${outlierPct.toFixed(1)}%)—within normal range but worth monitoring.`,
        severity: "neutral",
    };
}

/**
 * Main insight extraction router
 */
export function extractInsights(
    analyticsData: EnhancedAnalyticsData | null
): Record<string, ExtractedInsight | null> {
    if (!analyticsData) return {};

    return {
        drivers: extractDriverInsight(analyticsData.feature_importance),
        correlations: extractCorrelationInsight(analyticsData.correlation_analysis),
        // Add more as data becomes available
    };
}
