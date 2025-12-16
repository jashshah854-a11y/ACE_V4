/**
 * Utility functions to parse ACE report markdown content
 */

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
 * Extract key metrics from report markdown
 */
export function extractMetrics(markdown: string): ReportMetrics {
    if (!markdown) return {};

    const metrics: ReportMetrics = {};

    // Extract Data Quality Score (handles both percentage and decimal)
    const qualityMatch = markdown.match(/(?:data(?:set)?\s*quality(?:\s*score)?)[:\s]*(\d+(?:\.\d+)?)/i);
    if (qualityMatch) {
        const value = parseFloat(qualityMatch[1]);
        // Convert decimal to percentage if needed
        metrics.dataQualityScore = value <= 1 ? Math.round(value * 100) : value;
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

    return metrics;
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
