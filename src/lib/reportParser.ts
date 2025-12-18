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

export interface ClusterMetric {
    k: number;
    silhouetteScore: number;
    dataQuality: number;
}

export interface PersonaData {
    name: string;
    description: string;
    size: number;
    percentage: number;
    traits: string[];
}

export interface OutcomeModelData {
    r2: number;
    rmse: number;
    mae: number;
    features: Array<{ name: string; importance: number }>;
}

export interface AnomalyData {
    count: number;
    drivers?: Array<{ field: string; score: number }>;
    percentage?: number;
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

    // Extract Anomaly Count
    const anomalyMatch = markdown.match(/(?:anomal(?:y|ies))[:\s]*(?:detected)?[:\s]*(\d+)/i);
    if (anomalyMatch) {
        metrics.anomalyCount = parseInt(anomalyMatch[1]);
    }

    // Extract Confidence Level (Silhouette Score)
    const confidenceMatch = markdown.match(/(?:silhouette|confidence)[:\s]*(?:score)?[:\s]*(\d*\.?\d+)/i);
    if (confidenceMatch) {
        const value = parseFloat(confidenceMatch[1]);
        metrics.confidenceLevel = value <= 1 ? value * 100 : value;
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
 * Extract sections from markdown
 */
export function extractSections(markdown: string): ReportSection[] {
    if (!markdown) return [];

    const sections: ReportSection[] = [];
    const lines = markdown.split('\n');
    let currentSection: ReportSection | null = null;

    lines.forEach((line, index) => {
        // Match headers (## or ### )
        const headerMatch = line.match(/^(#{2,3})\s+(.+)$/);

        if (headerMatch) {
            // Save previous section if exists
            if (currentSection) {
                currentSection.endIndex = index - 1;
                sections.push(currentSection);
            }

            // Start new section
            const level = headerMatch[1].length - 1; // ## = level 1, ### = level 2
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
            // Add line to current section content
            currentSection.content += line + '\n';
        }
    });

    // Don't forget the last section
    if (currentSection) {
        currentSection.endIndex = lines.length - 1;
        sections.push(currentSection);
    }

    return sections;
}

/**
 * Extract chart data from markdown
 */
export function extractChartData(markdown: string): {
    segmentData: ChartData[];
    compositionData: ChartData[];
} {
    const segmentData: ChartData[] = [];
    const compositionData: ChartData[] = [];

    // Extract segment sizes for pie chart
    const sizePattern = /\*\*Size:\*\*\s*(\d+(?:,\d{3})*)/gi;
    const namePattern = /###\s+(.+)/g;

    const sizes = Array.from(markdown.matchAll(sizePattern));
    const names = Array.from(markdown.matchAll(namePattern));

    sizes.forEach((sizeMatch, index) => {
        const size = parseInt(sizeMatch[1].replace(/,/g, ''));
        const name = names[index] ? sanitizeDisplayText(names[index][1].trim()) : `Segment ${index + 1}`;

        segmentData.push({
            name,
            value: size
        });
    });

    return {
        segmentData,
        compositionData
    };
}

/**
 * Extract cluster metrics
 */
export function extractClusterMetrics(content: string): ClusterMetric | null {
    const sections = extractSections(content);
    const section = sections.find(s =>
        s.title.toLowerCase().includes('behavioral') &&
        s.title.toLowerCase().includes('cluster')
    );

    if (!section) return null;

    const kMatch = section.content.match(/\*\*k:\*\*\s*(\d+)/i);
    const silhouetteMatch = section.content.match(/silhouette\s*(?:score|coefficient)?[:\s]+([\d.]+)/i);
    const qualityMatch = section.content.match(/data\s*quality[:\s]+([\d.]+)/i);

    if (!kMatch && !silhouetteMatch) return null;

    return {
        k: kMatch ? parseInt(kMatch[1]) : 0,
        silhouetteScore: silhouetteMatch ? parseFloat(silhouetteMatch[1]) : 0,
        dataQuality: qualityMatch ? parseFloat(qualityMatch[1]) : 1.0
    };
}

/**
 * Extract personas
 */
export function extractPersonas(content: string): PersonaData[] {
    const personas: PersonaData[] = [];
    const sections = extractSections(content);

    sections.forEach(section => {
        // Look for persona-related sections (usually level 2 headers under personas section)
        if (section.level === 2 && section.content.includes('**Size:**')) {
            const sizeMatch = section.content.match(/\*\*Size:\*\*\s*(\d+(?:,\d{3})*)/);
            const descMatch = section.content.match(/\*\*Description:\*\*\s*(.+?)(?:\n|$)/);

            if (sizeMatch) {
                const size = parseInt(sizeMatch[1].replace(/,/g, ''));
                personas.push({
                    name: sanitizeDisplayText(section.title),
                    description: descMatch ? descMatch[1].trim() : '',
                    size,
                    percentage: 0, // Will calculate after all personas extracted
                    traits: []
                });
            }
        }
    });

    // Calculate percentages
    const total = personas.reduce((sum, p) => sum + p.size, 0);
    personas.forEach(persona => {
        persona.percentage = total > 0 ? (persona.size / total) * 100 : 0;
    });

    return personas;
}

/**
 * Extract outcome model data
 */
export function extractOutcomeModel(content: string): OutcomeModelData | null {
    const r2Match = content.match(/R²[:\s]+([-\d.]+)/i);
    const rmseMatch = content.match(/RMSE[:\s]+([\d,.]+)/i);
    const maeMatch = content.match(/MAE[:\s]+([\d,.]+)/i);

    if (!r2Match) return null;

    return {
        r2: parseFloat(r2Match[1]),
        rmse: rmseMatch ? parseFloat(rmseMatch[1].replace(/,/g, '')) : 0,
        mae: maeMatch ? parseFloat(maeMatch[1].replace(/,/g, '')) : 0,
        features: []
    };
}

/**
 * Extract anomaly data
 */
export function extractAnomalies(content: string): AnomalyData | null {
    const anomalyMatch = content.match(/(?:anomal(?:y|ies))[:\s]*(?:detected)?[:\s]*(\d+)/i);

    if (!anomalyMatch) return null;

    const count = parseInt(anomalyMatch[1]);

    // Try to extract total records for percentage calculation
    const recordsMatch = content.match(/(?:records?|rows?)[:\s]+(?:processed|analyzed)?[:\s]*(\d+(?:,\d{3})*)/i);
    const totalRecords = recordsMatch ? parseInt(recordsMatch[1].replace(/,/g, '')) : 0;

    return {
        count,
        percentage: totalRecords > 0 ? (count / totalRecords) * 100 : undefined,
        drivers: []
    };
}

/**
 * Parse status badges from content
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
    const seenNames = new Set<string>();

    for (const block of personaBlocks) {
        const titleMatch = block.match(/^(.+?)$/m);
        if (!titleMatch) continue;

        const title = sanitizeDisplayText(titleMatch[1].trim());

        if (seenNames.has(title)) {
            continue;
        }

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

        seenNames.add(title);
    }

    if (personas.length === 0) return [];

    const uniqueDescriptions = new Set(
        personas.map(p => `${p.summary}|${p.motivation}|${p.strategy}`.toLowerCase())
    );

    if (personas.length >= 3 && uniqueDescriptions.size === 1) {
        console.warn('All personas have identical descriptions - hiding persona section');
        return [];
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
