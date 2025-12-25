/**
 * Verdict Translator - Converts technical metrics to plain language
 * 
 * Transforms analyst-grade statistics into consultant-style interpretations
 * that non-technical stakeholders can understand and act upon.
 */

/**
 * Translates confidence/silhouette scores to plain language assessment
 * 
 * @param score - Confidence or silhouette score (0-1 or 0-100)
 * @returns Plain language verdict with actionability guidance
 * 
 * @example
 * translateConfidence(0.85) // "High confidence - segments are distinct and actionable"
 * translateConfidence(0.45) // "Low confidence - exploratory analysis only"
 */
export function translateConfidence(score: number): string {
    // Normalize to 0-1 range if given as percentage
    const normalized = score > 1 ? score / 100 : score;

    if (normalized >= 0.8) {
        return "High confidence - segments are distinct and actionable";
    }

    if (normalized >= 0.6) {
        return "Moderate confidence - usable with caution and validation";
    }

    if (normalized >= 0.4) {
        return "Low confidence - exploratory analysis only, not for decisions";
    }

    return "Insufficient confidence - do not use for business decisions";
}

/**
 * Translates R² model fit to plain language explanation
 * 
 * @param r2 - R-squared value (-Infinity to 1)
 * @returns Plain language verdict with usage guidance
 * 
 * @example
 * translateModelFit(0.85) // "Strong predictive model - reliable for forecasting"
 * translateModelFit(-0.43) // "Model failed - prediction not possible with this data"
 */
export function translateModelFit(r2: number): string {
    if (r2 >= 0.7) {
        return "Strong predictive model - reliable for forecasting and planning";
    }

    if (r2 >= 0.5) {
        return "Good model - useful for understanding trends and drivers";
    }

    if (r2 >= 0.3) {
        return "Moderate model - directional insights only, not precise predictions";
    }

    if (r2 >= 0) {
        return "Weak model - limited predictive value, shows general patterns only";
    }

    return "Model failed - prediction not possible with this data (negative R²)";
}

/**
 * Translates data quality score to plain language
 * 
 * @param quality - Data quality score (0-1 or 0-100)
 * @returns Plain language verdict
 * 
 * @example
 * translateDataQuality(0.95) // "Excellent data quality"
 * translateDataQuality(0.65) // "Acceptable quality with some gaps"
 */
export function translateDataQuality(quality: number): string {
    const normalized = quality > 1 ? quality / 100 : quality;

    if (normalized >= 0.9) {
        return "Excellent data quality - minimal missing or inconsistent values";
    }

    if (normalized >= 0.8) {
        return "Good quality - suitable for analysis with minor cleanup";
    }

    if (normalized >= 0.7) {
        return "Acceptable quality - some gaps may limit precision";
    }

    if (normalized >= 0.5) {
        return "Fair quality - significant gaps exist, interpret with caution";
    }

    return "Poor quality - data issues may invalidate conclusions";
}

/**
 * Translates anomaly count to actionability assessment
 * 
 * @param count - Number of anomalies detected
 * @param totalRecords - Total number of records analyzed
 * @returns Plain language verdict
 * 
 * @example
 * translateAnomalies(50, 10000) // "Minimal anomalies (0.5%) - investigate high-impact outliers"
 * translateAnomalies(2000, 10000) // "High anomaly rate (20%) - data quality concerns"
 */
export function translateAnomalies(count: number, totalRecords: number): string {
    const percentage = (count / totalRecords) * 100;

    if (count === 0) {
        return "No anomalies detected - data appears consistent";
    }

    if (percentage < 1) {
        return `Minimal anomalies (${percentage.toFixed(1)}%) - investigate high-impact outliers`;
    }

    if (percentage < 5) {
        return `Low anomaly rate (${percentage.toFixed(1)}%) - review flagged records`;
    }

    if (percentage < 15) {
        return `Moderate anomalies (${percentage.toFixed(1)}%) - may indicate data issues or interesting segments`;
    }

    return `High anomaly rate (${percentage.toFixed(1)}%) - investigate data quality or process issues`;
}

/**
 * Translates cluster count to segment interpretation
 * 
 * @param k - Number of clusters found
 * @returns Plain language verdict
 * 
 * @example
 * translateClusterCount(3) // "3 distinct segments - actionable for targeting"
 * translateClusterCount(12) // "12 segments - may be over-segmented, consider consolidation"
 */
export function translateClusterCount(k: number): string {
    if (k <= 0) {
        return "No meaningful segments found";
    }

    if (k <= 3) {
        return `${k} distinct segment${k > 1 ? 's' : ''} - actionable for targeting and strategy`;
    }

    if (k <= 5) {
        return `${k} segments - good granularity for differentiated approaches`;
    }

    if (k <= 8) {
        return `${k} segments - detailed segmentation, may need prioritization`;
    }

    return `${k} segments - may be over-segmented, consider consolidating similar groups`;
}

/**
 * Generates overall analysis verdict based on multiple metrics
 * 
 * @param metrics - Object containing various analysis metrics
 * @returns Overall plain language verdict
 */
export function translateOverallVerdict(metrics: {
    confidence?: number;
    r2?: number;
    dataQuality?: number;
    anomalies?: number;
    totalRecords?: number;
}): string {
    const { confidence, r2, dataQuality, anomalies, totalRecords } = metrics;

    // High confidence scenario
    if (
        (confidence && confidence >= 0.7) &&
        (dataQuality && dataQuality >= 0.8) &&
        (!r2 || r2 >= 0.5)
    ) {
        return "Strong analysis - findings are reliable and actionable";
    }

    // Moderate confidence scenario
    if (
        (confidence && confidence >= 0.5) ||
        (dataQuality && dataQuality >= 0.7) ||
        (r2 && r2 >= 0.3)
    ) {
        return "Moderate analysis - findings provide directional insights with caveats";
    }

    // Data quality concerns
    if (dataQuality && dataQuality < 0.6) {
        return "Limited reliability - data quality issues affect confidence in findings";
    }

    // Model failure scenario
    if (r2 !== undefined && r2 < 0) {
        return "Analysis incomplete - predictive modeling was not successful";
    }

    return "Preliminary findings - validate before making decisions";
}
