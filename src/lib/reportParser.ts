/**
 * Utility functions to parse ACE report markdown content
 */

import { MetricsSchema, ProgressMetricsSchema, ClusterMetricsSchema, type Metrics } from './reportSchema';

/**
 * Clean up technical identifiers from text to make it user-friendly
 * Converts cluster_0 → Cluster A, segment_1 → Segment B, etc.
 */
export function sanitizeDisplayText(text: string): string {
    if (!text) return text;

    let cleaned = text;

    // Convert cluster_X to Cluster A, B, C, etc.
    cleaned = cleaned.replace(/\bcluster_(\d+)\b/gi, (match, num) => {
        const letter = String.fromCharCode(65 + parseInt(num)); // A, B, C...
        return `Cluster ${letter}`;
    });

    // Convert segment_X to Segment 1, 2, 3, etc.
    cleaned = cleaned.replace(/\bsegment_(\d+)\b/gi, (match, num) => {
        return `Segment ${parseInt(num) + 1}`;
    });

    // Convert group_X to Group 1, 2, 3, etc.
    cleaned = cleaned.replace(/\bgroup_(\d+)\b/gi, (match, num) => {
        return `Group ${parseInt(num) + 1}`;
    });

    // Remove "Cluster (Cluster X)" redundancy - keep just the label in parens
    cleaned = cleaned.replace(/\bCluster\s+([A-Z])\s*\(([^)]+)\)/gi, '$2');

    // Clean up double spaces and redundancies
    cleaned = cleaned
        .replace(/\s{2,}/g, ' ')
        .replace(/\bCluster\s+Cluster\b/gi, 'Cluster')
        .replace(/\bSegment\s+Segment\b/gi, 'Segment')
        .trim();

    return cleaned;
}

export interface ReportMetrics {
    dataQualityScore?: number;
    recordsProcessed?: number;
    anomalyCount?: number;
    confidenceLevel?: number;
    completeness?: number;
    validRecords?: number;
}

export interface ReportSection {
    id: string;
    title: string;
    level: number;
    content: string;
    startIndex: number;
    endIndex: number;
}

export interface ChartData {
    name: string;
    value: number;
}

export interface StatusBadge {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info';
}

/**
 * Extract key metrics from report markdown with validation
 */
export function extractMetrics(markdown: string): ReportMetrics {
    if (!markdown) return {};

    const metrics: ReportMetrics = {};

    try {
        // Extract Data Quality Score (handles both percentage and decimal)
        const qualityMatch = markdown.match(/(?:data(?:set)?\s*quality(?:\s*score)?)[:\s]*(\d+(?:\.\d+)?)/i);
        if (qualityMatch) {
            const value = parseFloat(qualityMatch[1]);
            const score = value <= 1 ? Math.round(value * 100) : value;

            if (!isNaN(score) && score >= 0 && score <= 100) {
                metrics.dataQualityScore = score;
            } else {
                console.warn('Invalid data quality score extracted:', score);
            }
        }
    } catch (error) {
        console.warn('Failed to extract data quality score:', error);
    }

    // Extract Records Processed - look for cluster sizes or record counts
    const sizeMatches = markdown.matchAll(/\*\*Size:\*\*\s*(\d+(?:,\d{3})*)/gi);
    let totalRecords = 0;
    for (const match of sizeMatches) {
        totalRecords += parseInt(match[1].replace(/,/g, ''));
    }
    if (totalRecords > 0) {
        metrics.recordsProcessed = totalRecords;
    }

    // Fallback to other record patterns
    if (!metrics.recordsProcessed) {
        const recordsMatch = markdown.match(/(?:records?|rows?)[:\s]+(?:processed|analyzed)?[:\s]*(\d+(?:,\d{3})*)/i);
        if (recordsMatch) {
            metrics.recordsProcessed = parseInt(recordsMatch[1].replace(/,/g, ''));
        }
    }

    // Extract Anomaly Count - multiple patterns
    const anomalyMatch = markdown.match(/(?:total\s*)?anomal(?:y|ies)(?:\s*detected)?[:\s]*\**(\d+)\**/i);
    if (anomalyMatch) {
        metrics.anomalyCount = parseInt(anomalyMatch[1]);
    }

    // Extract Confidence Level / Silhouette Score
    const silhouetteMatch = markdown.match(/silhouette\s*score[:\s|]*(\d+(?:\.\d+)?)/i);
    if (silhouetteMatch) {
        metrics.confidenceLevel = Math.round(parseFloat(silhouetteMatch[1]) * 100);
    }

    // Fallback confidence pattern
    if (!metrics.confidenceLevel) {
        const confidenceMatch = markdown.match(/(?:confidence|certainty)[:\s]+(\d+(?:\.\d+)?)\s*%/i);
        if (confidenceMatch) {
            metrics.confidenceLevel = parseFloat(confidenceMatch[1]);
        }
    }

    // Extract Completeness (%)
    const completenessMatch = markdown.match(/(?:completeness)[:\s]+(\d+(?:\.\d+)?)\s*%/i);
    if (completenessMatch) {
        metrics.completeness = parseFloat(completenessMatch[1]);
    }

    // Extract Valid Records (%)
    const validMatch = markdown.match(/(?:valid records?)[:\s]+(\d+(?:\.\d+)?)\s*%/i);
    if (validMatch) {
        metrics.validRecords = parseFloat(validMatch[1]);
    }

    try {
        const validated = MetricsSchema.partial().parse(metrics);
        return validated;
    } catch (error) {
        console.error('Metrics validation failed:', error);
        console.warn('Returning unvalidated metrics with potential data issues');
        return metrics;
    }
}

/**
 * Parse markdown headers into sections with content
 */
export function extractSections(markdown: string): ReportSection[] {
    if (!markdown) return [];

    const sections: ReportSection[] = [];
    const lines = markdown.split('\n');

    let currentSection: ReportSection | null = null;

    lines.forEach((line, index) => {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headerMatch) {
            // Save previous section
            if (currentSection) {
                currentSection.endIndex = index - 1;
                sections.push(currentSection);
            }

            // Start new section
            const level = headerMatch[1].length;
            const title = headerMatch[2].trim();
            const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            currentSection = {
                id,
                title,
                level,
                content: '',
                startIndex: index,
                endIndex: index
            };
        } else if (currentSection) {
            currentSection.content += line + '\n';
        }
    });

    // Save last section
    if (currentSection) {
        currentSection.endIndex = lines.length - 1;
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Extract data for charts from report content
 */
export function extractChartData(markdown: string): {
    segmentData: ChartData[];
    compositionData: ChartData[];
} {
    if (!markdown) return { segmentData: [], compositionData: [] };

    const segmentData: ChartData[] = [];
    const compositionData: ChartData[] = [];

    // Look for segment/cluster data in tables or lists
    const segmentPattern = /(Segment|Cluster|Group)\s+(\d+)[:\s]+(\d+)/gi;
    let match;

    while ((match = segmentPattern.exec(markdown)) !== null) {
        segmentData.push({
            name: `${match[1]} ${match[2]}`,
            value: parseInt(match[3])
        });
    }

    // Look for composition data (percentages)
    const compositionPattern = /(?:-|\*)\s*(.+?):\s*(\d+(?:\.\d+)?)\s*%/g;

    while ((match = compositionPattern.exec(markdown)) !== null) {
        const name = match[1].trim();
        const value = parseFloat(match[2]);

        // Only add if it looks like a composition category
        if (value > 0 && value <= 100 && name.length < 50) {
            compositionData.push({ name, value });
        }
    }

    return { segmentData, compositionData };
}

/**
 * Parse status indicators and return appropriate badge variant
 */
export function parseStatusBadges(content: string): string[] {
    const badges: string[] = [];
    const keywords = ['critical', 'warning', 'success', 'error', 'info', 'pending'];

    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(content)) {
            badges.push(keyword);
        }
    });

    return Array.from(new Set(badges));
}

/**
 * Extract progress-style metrics (percentages)
 */
export function extractProgressMetrics(markdown: string): {
    completeness?: number;
    confidence?: number;
    validRecords?: number;
} {
    const metrics = extractMetrics(markdown);

    return {
        completeness: metrics.completeness,
        confidence: metrics.confidenceLevel,
        validRecords: metrics.validRecords
    };
}

// ─────────────────────────────────────────────────────────────────
// Additional extractors for WideReportViewer
// ─────────────────────────────────────────────────────────────────

export interface ClusterMetrics {
    optimalK: number;
    silhouetteScore: number;
    dataQuality: number;
    clusters: { label: string; size: number }[];
}

export function extractClusterMetrics(markdown: string): ClusterMetrics | null {
    if (!markdown) return null;

    const kMatch = markdown.match(/optimal\s*clusters?\s*\(k\)[:\s|]*(\d+)/i);
    const silMatch = markdown.match(/silhouette\s*score[:\s|]*(\d+(?:\.\d+)?)/i);
    const qualityMatch = markdown.match(/data\s*quality[:\s|]*(\d+(?:\.\d+)?)/i);

    if (!kMatch && !silMatch) return null;

    const clusters: { label: string; size: number }[] = [];
    const clusterPattern = /cluster[_\s]?(\d+).*?size[:\s]*\*?\*?(\d+)/gi;
    let m: RegExpExecArray | null;
    while ((m = clusterPattern.exec(markdown)) !== null) {
        const letter = String.fromCharCode(65 + parseInt(m[1]));
        clusters.push({ label: `Cluster ${letter}`, size: parseInt(m[2]) });
    }

    return {
        optimalK: kMatch ? parseInt(kMatch[1]) : clusters.length || 0,
        silhouetteScore: silMatch ? parseFloat(silMatch[1]) : 0,
        dataQuality: qualityMatch ? parseFloat(qualityMatch[1]) : 1,
        clusters,
    };
}

export interface Persona {
    name: string;
    label: string;
    size: number;
    summary: string;
    motivation: string;
    strategy: string;
    tactics: string[];
}

export function extractPersonas(markdown: string): Persona[] {
    if (!markdown) return [];

    const personas: Persona[] = [];
    const personaBlocks = markdown.split(/###\s+/g).slice(1);

    for (const block of personaBlocks) {
        const titleMatch = block.match(/^(.+?)$/m);
        if (!titleMatch) continue;

        const title = sanitizeDisplayText(titleMatch[1].trim());

        // Check if it looks like a persona block
        // Must have **Size:** or - **Size:** pattern with a number
        const sizeMatch = block.match(/[-\*]\s*\*?\*?size:?\*?\*?\s*(\d+)/i);
        if (!sizeMatch) continue;

        const summaryMatch = block.match(/[-\*]\s*\*?\*?summary:?\*?\*?\s*(.+?)(?:\n|$)/i);
        const motivationMatch = block.match(/[-\*]\s*\*?\*?motivation:?\*?\*?\s*(.+?)(?:\n|$)/i);
        const strategyMatch = block.match(/[-\*]\s*\*?\*?strategic\s*approach:?\*?\*?\s*(.+?)(?:\n|$)/i);

        const tactics: string[] = [];
        const tacticMatches = block.matchAll(/^-\s+(.+)$/gm);
        for (const t of tacticMatches) {
            tactics.push(t[1].trim());
        }

        personas.push({
            name: title,
            label: title,
            size: parseInt(sizeMatch[1]),
            summary: summaryMatch ? summaryMatch[1].trim() : '',
            motivation: motivationMatch ? motivationMatch[1].trim() : '',
            strategy: strategyMatch ? strategyMatch[1].trim() : '',
            tactics,
        });
    }

    return personas;
}

export interface OutcomeModel {
    target: string;
    r2: number;
    rmse: number;
    mae: number;
    insight: string;
    drivers: { field: string; importance: number }[];
}

export function extractOutcomeModel(markdown: string): OutcomeModel | null {
    if (!markdown) return null;

    const targetMatch = markdown.match(/\*?\*?target:?\*?\*?\s*`?([^`\n(]+)`?\s*\(R/i)
        || markdown.match(/\*?\*?target:?\*?\*?\s*`?([^`\n]+)`?/i);
    const r2Match = markdown.match(/R[²2][:\s]*(-?\d+(?:\.\d+)?)/i);
    const rmseMatch = markdown.match(/RMSE[:\s]*(\d+(?:\.\d+)?)/i);
    const maeMatch = markdown.match(/MAE[:\s]*(\d+(?:\.\d+)?)/i);
    const insightMatch = markdown.match(/\*?\*?insight:?\*?\*?\s*(.+?)(?:\n|$)/i);

    if (!r2Match) return null;

    const drivers: { field: string; importance: number }[] = [];
    const driverPattern = /[-•]\s*(\w+)[:\s]+importance\s*(\d+(?:\.\d+)?)/gi;
    let d: RegExpExecArray | null;
    while ((d = driverPattern.exec(markdown)) !== null) {
        drivers.push({ field: d[1], importance: parseFloat(d[2]) });
    }

    return {
        target: targetMatch ? targetMatch[1].trim() : 'Unknown',
        r2: parseFloat(r2Match[1]),
        rmse: rmseMatch ? parseFloat(rmseMatch[1]) : 0,
        mae: maeMatch ? parseFloat(maeMatch[1]) : 0,
        insight: insightMatch ? insightMatch[1].trim() : '',
        drivers,
    };
}

export interface AnomalyData {
    count: number;
    drivers: { field: string; score: number }[];
}

export function extractAnomalies(markdown: string): AnomalyData | null {
    if (!markdown) return null;

    const countMatch = markdown.match(/total\s*anomal(?:y|ies)\s*detected[:\s]*\*?\*?(\d+)\*?\*?/i)
        || markdown.match(/\*?\*?(\d+)\*?\*?\s*anomal(?:y|ies)/i);

    if (!countMatch) return null;

    const drivers: { field: string; score: number }[] = [];
    const driverPattern = /[-•]\s*(\w+)[:\s]+(-?\d+(?:\.\d+)?)/g;
    const anomalySection = markdown.match(/anomaly detection[\s\S]*?(?=##|$)/i);
    if (anomalySection) {
        let m: RegExpExecArray | null;
        while ((m = driverPattern.exec(anomalySection[0])) !== null) {
            drivers.push({ field: m[1], score: parseFloat(m[2]) });
        }
    }

    return {
        count: parseInt(countMatch[1]),
        drivers,
    };
}
