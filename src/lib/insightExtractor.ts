import type { EnhancedAnalyticsData } from "@/types/reportTypes";

/**
 * Insight Extraction with Guardrails
 * 
 * GUARDRAILS:
 * 1. Sample size below MIN_SAMPLE_SIZE caps severity at "neutral"
 * 2. High variance + low coverage downgrades confidence
 * 3. Only ONE primary insight per section
 */

const MIN_SAMPLE_SIZE = 100; // Minimum records for high severity insights
const LOW_COVERAGE_THRESHOLD = 0.7; // Below this, downgrade confidence

export interface ExtractedInsight {
    text: string;
    severity: "positive" | "neutral" | "warning" | "risk";
    confidence?: number;
    watchItem?: string;
}

/**
 * Apply guardrails to insight severity and confidence
 */
function applyGuardrails(
    insight: ExtractedInsight,
    sampleSize?: number,
    coverage?: number,
    variance?: number
): ExtractedInsight {
    let adjustedSeverity = insight.severity;
    let adjustedConfidence = insight.confidence;

    // Guardrail 1: Low sample size caps severity
    if (sampleSize !== undefined && sampleSize < MIN_SAMPLE_SIZE) {
        if (adjustedSeverity === "warning" || adjustedSeverity === "risk" || adjustedSeverity === "positive") {
            adjustedSeverity = "neutral";
        }
    }

    // Guardrail 2: High variance + low coverage reduces confidence
    if (coverage !== undefined && coverage < LOW_COVERAGE_THRESHOLD && variance !== undefined && variance > 1.0) {
        adjustedConfidence = adjustedConfidence ? adjustedConfidence * 0.6 : undefined;
    }

    return {
        ...insight,
        severity: adjustedSeverity,
        confidence: adjustedConfidence,
    };
}

/**
 * Extract insight from feature importance data
 */
export function extractDriverInsight(
    data: EnhancedAnalyticsData["feature_importance"],
    sampleSize?: number
): ExtractedInsight | null {
    if (!data?.available || !data.feature_importance?.length) {
        return null;
    }

    const topDriver = data.feature_importance[0];
    const topImportance = topDriver?.importance || 0;
    const secondImportance = data.feature_importance[1]?.importance || 0;

    let insight: ExtractedInsight;

    // Check if one feature dominates
    if (topImportance > secondImportance * 2) {
        insight = {
            text: `${topDriver.feature} is the strongest driver observed (relative importance ${Math.round(topImportance)}).`,
            severity: "positive",
            confidence: data.confidence,
            watchItem: `Monitor ${topDriver.feature} for disproportionate influence on ${data.target || "outcomes"}.`,
        };
    } else {
        // Balanced importance
        const topThree = data.feature_importance.slice(0, 3).map((f) => f.feature).join(", ");
        insight = {
            text: `Power distributed across ${topThree}—no single dominant factor.`,
            severity: "neutral",
            confidence: data.confidence,
        };
    }

    return applyGuardrails(insight, sampleSize);
}

/**
 * Extract insight from correlation data
 */
export function extractCorrelationInsight(
    data: EnhancedAnalyticsData["correlation_analysis"],
    sampleSize?: number
): ExtractedInsight | null {
    if (!data?.available || !data.strong_correlations?.length) {
        return null;
    }

    const strongestCorr = data.strong_correlations[0];
    const strength = Math.abs(strongestCorr.pearson);

    let insight: ExtractedInsight;

    if (strength > 0.8) {
        insight = {
            text: `${strongestCorr.feature1} and ${strongestCorr.feature2}: ${strength.toFixed(2)} ${strongestCorr.direction} correlation detected.`,
            severity: "warning",
            watchItem: "Very strong correlation may indicate redundancy—verify independence.",
        };
    } else if (strength > 0.5) {
        insight = {
            text: `${strongestCorr.feature1} and ${strongestCorr.feature2} move ${strongestCorr.direction === "positive" ? "together" : "oppositely"} (${strength.toFixed(2)}).`,
            severity: "neutral",
        };
    } else {
        insight = {
            text: `${data.total_correlations} relationships found—mostly moderate strength.`,
            severity: "neutral",
        };
    }

    return applyGuardrails(insight, sampleSize);
}

/**
 * Extract insight from distribution data
 */
export function extractDistributionInsight(
    columnName: string,
    stats: { min: number; max: number; mean: number; std: number; median: number },
    sampleSize?: number
): ExtractedInsight | null {
    const range = stats.max - stats.min;
    const cov = stats.std / Math.abs(stats.mean || 1);

    let insight: ExtractedInsight;

    // High variability
    if (cov > 1.0) {
        insight = {
            text: `${columnName} coefficient of variation: ${cov.toFixed(1)}. Spread exceeds central tendency.`,
            severity: "warning",
        };
    } else {
        // Skewed distribution
        const skew = Math.abs(stats.mean - stats.median) / (stats.std || 1);
        if (skew > 0.5) {
            insight = {
                text: `${columnName} skewed. Mean ${stats.mean.toFixed(1)} differs from median ${stats.median.toFixed(1)}.`,
                severity: "neutral",
                watchItem: "Skewed distributions may need log transformation.",
            };
        } else {
            // Normal-ish
            insight = {
                text: `${columnName} approximately normal. Mean ${stats.mean.toFixed(1)}, range ${range.toFixed(1)}.`,
                severity: "neutral",
            };
        }
    }

    return applyGuardrails(insight, sampleSize, undefined, cov);
}

/**
 * Extract insight from segment/cluster data
 */
export function extractSegmentInsight(
    segments: Array<{ label?: string; size?: number; avgValue?: number }>,
    totalSampleSize?: number
): ExtractedInsight | null {
    if (!segments.length) return null;

    const totalSize = segments.reduce((sum, s) => sum + (s.size || 0), 0);
    const largestSegment = segments.reduce((max, s) =>
        (s.size || 0) > (max.size || 0) ? s : max, segments[0]
    );

    const largestPct = ((largestSegment.size || 0) / totalSize) * 100;

    let insight: ExtractedInsight;

    // One dominant segment
    if (largestPct > 50) {
        insight = {
            text: `${largestSegment.label || "Largest group"}: ${largestPct.toFixed(0)}% of population.`,
            severity: "positive",
        };
    } else if (segments.length >= 3) {
        // Balanced segments
        insight = {
            text: `${segments.length} segments with balanced distribution—differentiation opportunity.`,
            severity: "neutral",
            watchItem: "Segment-specific tactics often lift conversion 20-40%.",
        };
    } else {
        insight = {
            text: `${segments.length} segments with similar sizes.`,
            severity: "neutral",
        };
    }

    return applyGuardrails(insight, totalSampleSize);
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
            text: "No outliers beyond 3σ threshold.",
            severity: "positive",
        };
    }

    const outlierPct = (outliers.length / values.length) * 100;

    let insight: ExtractedInsight;

    if (outlierPct > 5) {
        insight = {
            text: `${outlierPct.toFixed(1)}% outlier rate exceeds tolerance—review data quality.`,
            severity: "warning",
            watchItem: "High outlier rates may indicate errors or require separate handling.",
        };
    } else {
        insight = {
            text: `${outliers.length} outliers (${outlierPct.toFixed(1)}%)—within acceptable range.`,
            severity: "neutral",
        };
    }

    return applyGuardrails(insight, values.length);
}

/**
 * Main insight extraction router
 */
export function extractInsights(
    analyticsData: EnhancedAnalyticsData | null,
    sampleSize?: number
): Record<string, ExtractedInsight | null> {
    if (!analyticsData) return {};

    return {
        drivers: extractDriverInsight(analyticsData.feature_importance, sampleSize),
        correlations: extractCorrelationInsight(analyticsData.correlation_analysis, sampleSize),
        // Add more as needed
    };
}
