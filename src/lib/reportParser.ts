/**
 * Utility functions to parse ACE report markdown content
 */

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

    // Extract Data Quality Score (0-100%)
    const qualityMatch = markdown.match(/(?:data quality|quality score)[:\s]+(\d+(?:\.\d+)?)/i);
    if (qualityMatch) {
        metrics.dataQualityScore = parseFloat(qualityMatch[1]);
    }

    // Extract Records Processed
    const recordsMatch = markdown.match(/(?:records?|rows?)[:\s]+(?:processed|analyzed)?[:\s]*(\d+(?:,\d{3})*)/i);
    if (recordsMatch) {
        metrics.recordsProcessed = parseInt(recordsMatch[1].replace(/,/g, ''));
    }

    // Extract Anomaly Count
    const anomalyMatch = markdown.match(/(?:anomal(?:y|ies))[:\s]+(\d+)/i);
    if (anomalyMatch) {
        metrics.anomalyCount = parseInt(anomalyMatch[1]);
    }

    // Extract Confidence Level (%)
    const confidenceMatch = markdown.match(/(?:confidence|certainty)[:\s]+(\d+(?:\.\d+)?)\s*%/i);
    if (confidenceMatch) {
        metrics.confidenceLevel = parseFloat(confidenceMatch[1]);
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
export function parseStatusBadges(text: string): StatusBadge[] {
    const badges: StatusBadge[] = [];
    const statusPattern = /\b(high|excellent|good|moderate|low|poor|warning|error|failed|success)\b/gi;

    const matches = text.matchAll(statusPattern);

    for (const match of matches) {
        const status = match[0].toLowerCase();
        let variant: StatusBadge['variant'] = 'info';

        if (['high', 'excellent', 'good', 'success'].includes(status)) {
            variant = 'success';
        } else if (['moderate', 'warning'].includes(status)) {
            variant = 'warning';
        } else if (['low', 'poor', 'error', 'failed'].includes(status)) {
            variant = 'error';
        }

        badges.push({
            text: match[0],
            variant
        });
    }

    return badges;
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
