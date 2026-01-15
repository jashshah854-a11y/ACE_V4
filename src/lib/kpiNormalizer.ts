/**
 * KPI Normalizer
 * 
 * Translates raw backend metrics into consistent KPI cards.
 */

import type { KPI, KPIStatus, TrustLabel } from '@/types/RunSummaryViewModel';

/**
 * Translate confidence score to label
 */
export function translateConfidence(score: number): TrustLabel {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'moderate';
    return 'low';
}

/**
 * Translate score to KPI status
 */
export function translateKPIStatus(score: number): KPIStatus {
    if (score >= 0.7) return 'good';
    if (score >= 0.4) return 'warning';
    return 'bad';
}

/**
 * Normalize KPIs from raw backend data
 */
export function normalizeKPIs(rawPayload: any): KPI[] {
    const kpis: KPI[] = [];

    // KPI 1: Confidence
    const confidence = rawPayload.confidence || rawPayload.data_confidence || 0;
    kpis.push({
        key: 'confidence',
        label: 'Confidence',
        value: `${Math.round(confidence * 100)}%`,
        status: translateKPIStatus(confidence),
        meaning: confidence >= 0.7
            ? 'Suitable for planning and evaluation'
            : confidence >= 0.4
                ? 'Use for directional insight only'
                : 'Exploratory results, not decision-ready',
    });

    // KPI 2: Data Clarity
    const quality = rawPayload.quality_score || rawPayload.data_quality || 0;
    kpis.push({
        key: 'data_clarity',
        label: 'Data Clarity',
        value: `${Math.round(quality * 100)}%`,
        status: translateKPIStatus(quality),
        meaning: quality >= 0.7
            ? 'Schema is clean and complete'
            : quality >= 0.4
                ? 'Some data quality issues detected'
                : 'Significant data quality concerns',
    });

    // KPI 3: Records Analyzed
    const rows = rawPayload.row_count || 0;
    kpis.push({
        key: 'records_analyzed',
        label: 'Records Analyzed',
        value: rows.toLocaleString(),
        status: rows >= 1000 ? 'good' : rows >= 100 ? 'warning' : 'bad',
        meaning: rows >= 1000
            ? 'Sufficient sample for reliable insights'
            : rows >= 100
                ? 'Limited sample, insights vary'
                : 'Insufficient data for reliability',
    });

    // KPI 4 (optional): Features
    const columns = rawPayload.column_count || 0;
    if (columns > 0) {
        kpis.push({
            key: 'features',
            label: 'Features',
            value: columns,
            status: columns >= 5 ? 'good' : columns >= 3 ? 'warning' : 'bad',
            meaning: columns >= 5
                ? 'Rich feature set for modeling'
                : columns >= 3
                    ? 'Limited features; consider enrichment'
                    : 'Very few features; insights may be limited',
        });
    }

    // Return top 3-4 KPIs
    return kpis.slice(0, 4);
}
