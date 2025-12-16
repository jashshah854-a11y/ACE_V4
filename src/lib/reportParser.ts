/**
 * Utility functions to parse ACE report markdown content
 */

/**
 * Clean up technical identifiers from text to make it user-friendly
 * Removes patterns like "cluster_0", "cluster_1", etc.
 */
export function sanitizeDisplayText(text: string): string {
    if (!text) return text;

    // Remove cluster_X patterns (with or without parentheses)
    let cleaned = text
        // Remove "cluster_X (Label)" patterns - keep just the label
        .replace(/\bcluster_\d+\s*\(([^)]+)\)/gi, '$1')
        // Remove standalone "cluster_X" patterns
        .replace(/\bcluster_\d+\b/gi, '')
        // Remove "Cluster cluster_X" redundant patterns
        .replace(/\bCluster\s+cluster_\d+/gi, 'Cluster')
        // Clean up double spaces
        .replace(/\s{2,}/g, ' ')
        // Clean up "Cluster Cluster" redundancy
        .replace(/\bCluster\s+Cluster\b/gi, 'Cluster')
        // Remove leading/trailing spaces
        .trim();

    // Remove trailing "Cluster" if the text already describes the cluster type
    // e.g., "Budget Conscious Cluster Cluster" -> "Budget Conscious"
    if (cleaned.match(/\b\w+\s+Conscious\s+Cluster$/i)) {
        cleaned = cleaned.replace(/\s+Cluster$/i, '');
    }

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

export interface ClusterMetric {
    k: number;
    silhouetteScore: number;
    dataQuality: number;
    clusterSizes?: number[];
}

export interface PersonaData {
    name: string;
    label: string;
    size: number;
    clusterId?: string;
    summary?: string;
    motivation?: string;
    strategy?: {
        headline: string;
        tactics: string[];
    };
}

export interface OutcomeModelData {
    status: 'ok' | 'failed' | 'skipped';
    target: string;
    r2?: number;
    rmse?: number;
    mae?: number;
    narrative?: string;
    drivers?: Array<{ feature: string; importance: number }>;
}

export interface AnomalyData {
    count: number;
    drivers?: Array<{ field: string; score: number }>;
    percentage?: number;
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

/**
 * Extract cluster metrics from Behavioral Clusters section
 */
export function extractClusterMetrics(content: string): ClusterMetric | null {
    const sections = extractSections(content);
    const section = sections.find(s =>
        s.title.toLowerCase().includes('behavioral') &&
        s.title.toLowerCase().includes('cluster')
    );

    if (!section) return null;

    // Parse table format:
    // | Optimal Clusters (k) | 3 |
    // | Silhouette Score | 0.5886543114473759 |
    // | Data Quality | 1.0 |

    const kMatch = section.content.match(/Optimal Clusters.*?\|.*?(\d+)/i);
    const silhouetteMatch = section.content.match(/Silhouette Score.*?\|.*?([\d.]+)/i);
    const qualityMatch = section.content.match(/Data Quality.*?\|.*?([\d.]+)/i);

    return {
        k: kMatch ? parseInt(kMatch[1]) : 0,
        silhouetteScore: silhouetteMatch ? parseFloat(silhouetteMatch[1]) : 0,
        dataQuality: qualityMatch ? parseFloat(qualityMatch[1]) : 1.0
    };
}

/**
 * Extract persona data from Personas section
 */
export function extractPersonas(content: string): PersonaData[] {
    const sections = extractSections(content);
    const personasSection = sections.find(s =>
        s.title.toLowerCase().includes('persona') ||
        s.title.toLowerCase().includes('generated personas')
    );

    if (!personasSection) return [];

    const personas: PersonaData[] = [];

    // Parse markdown like:
    // ### The Budget-Conscious Shopper (cost_sensitive)
    // - **Size:** 3,219
    // - **Summary:** Price-driven with lowest monthly_spend

    const personaBlocks = personasSection.content.split(/###\s+/);

    personaBlocks.forEach(block => {
        if (!block.trim()) return;

        const nameMatch = block.match(/^(.+?)\s*\(([^)]+)\)/);
        const sizeMatch = block.match(/Size:\*\*\s*([\d,]+)/);
        const summaryMatch = block.match(/Summary:\*\*\s*(.+)/);
        const motivationMatch = block.match(/Motivation:\*\*\s*(.+)/);

        if (nameMatch && sizeMatch) {
            personas.push({
                name: nameMatch[1].trim(),
                label: nameMatch[2],
                size: parseInt(sizeMatch[1].replace(/,/g, '')),
                summary: summaryMatch?.[1],
                motivation: motivationMatch?.[1]
            });
        }
    });

    return personas;
}

/**
 * Extract outcome modeling data
 */
export function extractOutcomeModel(content: string): OutcomeModelData | null {
    const sections = extractSections(content);
    const section = sections.find(s =>
        s.title.toLowerCase().includes('outcome') ||
        s.title.toLowerCase().includes('modeling')
    );

    if (!section) return null;

    // Check if skipped
    if (section.content.toLowerCase().includes('skipped') ||
        section.content.toLowerCase().includes('not available')) {
        return {
            status: 'skipped',
            target: 'unknown'
        };
    }

    // Parse: - **Target:** `monthly_spend` (R² -0.43, RMSE 31095842.82, MAE 17614090.12)
    const targetMatch = section.content.match(/Target:\*\*\s*`([^`]+)`/);
    const r2Match = section.content.match(/R[²^]2?\s*([-\d.]+)/);
    const rmseMatch = section.content.match(/RMSE\s*([\d.]+)/);
    const maeMatch = section.content.match(/MAE\s*([\d.]+)/);
    const narrativeMatch = section.content.match(/Insight:\*\*\s*(.+)/);

    const r2 = r2Match ? parseFloat(r2Match[1]) : undefined;

    // Parse feature importance
    const drivers: Array<{ feature: string; importance: number }> = [];
    const driverMatches = section.content.matchAll(/[-*]\s*([^:]+):\s*importance\s*([\d.]+)/g);
    for (const match of driverMatches) {
        drivers.push({
            feature: match[1].trim(),
            importance: parseFloat(match[2])
        });
    }

    return {
        status: r2 !== undefined && r2 > 0.3 ? 'ok' : 'failed',
        target: targetMatch?.[1] || 'unknown',
        r2,
        rmse: rmseMatch ? parseFloat(rmseMatch[1]) : undefined,
        mae: maeMatch ? parseFloat(maeMatch[1]) : undefined,
        narrative: narrativeMatch?.[1],
        drivers: drivers.length > 0 ? drivers.slice(0, 5) : undefined
    };
}

/**
 * Extract anomaly detection data
 */
export function extractAnomalies(content: string): AnomalyData | null {
    const sections = extractSections(content);
    const section = sections.find(s => s.title.toLowerCase().includes('anomaly'));

    if (!section) return null;

    const countMatch = section.content.match(/Total Anomal(?:y|ies).*?(\d+)/i);

    if (!countMatch) return null;

    const count = parseInt(countMatch[1]);

    // Parse drivers: - monthly_spend: 0.53
    const drivers: Array<{ field: string; score: number }> = [];
    const driverMatches = section.content.matchAll(/[-*]\s*([^:]+):\s*([\d.]+)/g);

    for (const match of driverMatches) {
        const field = match[1].trim();
        const score = parseFloat(match[2]);

        // Only include if it looks like a field name and score
        if (field.length > 0 && field.length < 50 && score >= 0 && score <= 1) {
            drivers.push({ field, score });
        }
    }

    return {
        count,
        drivers: drivers.length > 0 ? drivers.slice(0, 5) : undefined
    };
}
