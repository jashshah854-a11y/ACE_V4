/**
 * Utility functions to parse ACE report markdown content
 */

import { MetricsSchema, ProgressMetricsSchema, ClusterMetricsSchema, type Metrics } from './reportSchema';
import type { EnhancedAnalyticsData } from './enhancedAnalyticsTypes';

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

    // 1. Try to extract from JSON Metadata block (New V4 Standard)
    try {
        const jsonMatch = markdown.match(/##\s*Run Metadata\s+```json\s*([\s\S]*?)\s*```/i);
        if (jsonMatch && jsonMatch[1]) {
            const metadata = JSON.parse(jsonMatch[1]);

            // Map JSON fields to ReportMetrics
            if (metadata.quality_score !== undefined) {
                const parsedQuality = Number(metadata.quality_score);
                if (!Number.isNaN(parsedQuality)) {
                    metrics.dataQualityScore = parsedQuality > 1 ? parsedQuality : parsedQuality * 100;
                }
            }
            if (metadata.confidence !== undefined) {
                // Handle confidence object or number
                if (typeof metadata.confidence === 'object' && metadata.confidence.score) {
                    metrics.confidenceLevel = Number(metadata.confidence.score) * 100;
                } else if (typeof metadata.confidence === 'number') {
                    metrics.confidenceLevel = Number(metadata.confidence) * 100;
                }
            }
            if (metadata.row_count !== undefined) {
                metrics.recordsProcessed = Number(metadata.row_count);
            }
            // If we found quality score in JSON, we trust it more than regex
        }
    } catch (e) {
        console.warn('Failed to parse JSON metadata block:', e);
    }

    // 2. Fallback / Supplement with Regex extraction (Backward Compatibility)
    if (metrics.dataQualityScore === undefined) {
        try {
            // Extract Data Quality Score (handles both percentage and decimal)
            const qualityMatch = markdown.match(/(?:data(?:set)?\s*quality(?:\s*score)?)[:\s]*(\d+(?:\.\d+)?)/i);
            if (qualityMatch) {
                const value = parseFloat(qualityMatch[1]);
                const score = value <= 1 ? Math.round(value * 100) : value;

                if (!isNaN(score) && score >= 0 && score <= 100) {
                    metrics.dataQualityScore = score;
                }
            }
        } catch (error) {
            console.warn('Failed to extract data quality score via regex:', error);
        }
    }

    // Extract Records Processed - look for cluster sizes or record counts
    if (metrics.recordsProcessed === undefined) {
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
        const sectionToPush: ReportSection = currentSection;
        sectionToPush.endIndex = lines.length - 1;
        sections.push(sectionToPush);
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
 * Note: named uniquely to avoid clashes with any global helpers.
 */
export function parseClusterMetrics(content: string): ClusterMetric | null {
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

// ─────────────────────────────────────────────────────────────────
// Three-Panel Insight Canvas Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Extract the "Governing Thought" — the declarative headline for the narrative
 * Looks for the first H1 or H2 that isn't a metadata section
 */
export function extractGoverningThought(markdown: string): string {
    if (!markdown) return "Intelligence Report";

    const sections = extractSections(markdown);

    // Skip metadata sections
    const metadataSections = ['run metadata', 'confidence & governance', 'validation & guardrails'];

    for (const section of sections) {
        const lowerTitle = section.title.toLowerCase();

        // Skip metadata sections
        if (metadataSections.some(meta => lowerTitle.includes(meta))) {
            continue;
        }

        // Look for declarative statements (questions, insights, summaries)
        if (section.level === 1 || section.level === 2) {
            // Prefer "Executive Summary" or similar high-level sections
            if (lowerTitle.includes('summary') || lowerTitle.includes('overview')) {
                // Extract first sentence from content as governing thought
                const firstSentence = section.content.split(/[.!?]/)[0]?.trim();
                if (firstSentence && firstSentence.length > 10 && firstSentence.length < 150) {
                    return firstSentence;
                }
            }

            // Otherwise use the section title itself if it's descriptive
            if (section.title.length > 10 && section.title.length < 100) {
                return section.title;
            }
        }
    }

    return "Intelligence Report";
}

/**
 * SCQA Block Structure
 * Situation-Complication-Question-Answer framework for narrative storytelling
 */
export interface SCQABlock {
    situation: string;      // Historical baseline, context
    complication: string;   // Anomalies, issues, challenges
    question: string;       // Implicit question being answered
    answer: string;         // Strategic response, recommendation
}

/**
 * Parse markdown sections into SCQA story blocks
 * Maps report sections to the Pyramid Principle structure
 */
export function parseSCQABlocks(markdown: string): SCQABlock[] {
    if (!markdown) return [];

    const sections = extractSections(markdown);
    const blocks: SCQABlock[] = [];

    // Map sections to SCQA components
    let currentBlock: Partial<SCQABlock> = {};

    for (const section of sections) {
        const lowerTitle = section.title.toLowerCase();

        // Situation: Executive Summary, Data Type, Overview
        if (lowerTitle.includes('summary') || lowerTitle.includes('overview') || lowerTitle.includes('data type')) {
            currentBlock.situation = section.content.trim();
        }

        // Complication: Anomalies, Validation Issues, Limitations
        else if (lowerTitle.includes('anomal') || lowerTitle.includes('limitation') || lowerTitle.includes('issue')) {
            currentBlock.complication = section.content.trim();
        }

        // Answer: Business Intelligence, Recommendations, Insights
        else if (lowerTitle.includes('business') || lowerTitle.includes('insight') || lowerTitle.includes('recommendation')) {
            currentBlock.answer = section.content.trim();

            // Complete the block
            if (currentBlock.situation || currentBlock.complication) {
                blocks.push({
                    situation: currentBlock.situation || '',
                    complication: currentBlock.complication || '',
                    question: '', // Implicit from context
                    answer: currentBlock.answer || '',
                });
                currentBlock = {};
            }
        }
    }

    return blocks;
}

/**
 * Evidence Object for click-to-verify lineage
 */
export interface EvidenceObject {
    id: string;
    type: 'business_pulse' | 'predictive_drivers' | 'correlation' | 'distribution' | 'quality';
    claim: string;
    proof: {
        sql?: string;
        python?: string;
        rawData: any;
    };
    lineage: {
        sourceTable: string;
        transformations: string[];
    };
}

/**
 * Extract evidence objects from enhanced analytics
 * Generates structured proof objects for click-to-verify interactions
 */
export function extractEvidenceObjects(
    markdown: string,
    enhancedAnalytics: EnhancedAnalyticsData | null | undefined
): EvidenceObject[] {
    const evidence: EvidenceObject[] = [];

    if (!enhancedAnalytics) return evidence;

    // Business Pulse Evidence
    if (enhancedAnalytics.business_intelligence?.value_metrics) {
        const vm = enhancedAnalytics.business_intelligence.value_metrics;
        const valueCol = enhancedAnalytics.business_intelligence.evidence?.value_column || 'value';

        evidence.push({
            id: 'total-value',
            type: 'business_pulse',
            claim: `Total Value: $${vm.total_value?.toLocaleString() || 0}`,
            proof: {
                python: `df['${valueCol}'].sum()`,
                rawData: { total_value: vm.total_value, avg_value: vm.avg_value, median_value: vm.median_value },
            },
            lineage: {
                sourceTable: 'active_dataset',
                transformations: ['sum aggregation'],
            },
        });

        evidence.push({
            id: 'avg-value',
            type: 'business_pulse',
            claim: `Average Value: $${vm.avg_value?.toLocaleString() || 0}`,
            proof: {
                python: `df['${valueCol}'].mean()`,
                rawData: vm,
            },
            lineage: {
                sourceTable: 'active_dataset',
                transformations: ['mean aggregation'],
            },
        });
    }

    // Correlation Evidence
    if (enhancedAnalytics.correlation_analysis?.strong_correlations) {
        enhancedAnalytics.correlation_analysis.strong_correlations.slice(0, 10).forEach((corr: any, index: number) => {
            evidence.push({
                id: `corr-${index}`,
                type: 'correlation',
                claim: `${corr.feature1} ↔ ${corr.feature2}: ${corr.pearson?.toFixed(3)}`,
                proof: {
                    python: `df[['${corr.feature1}', '${corr.feature2}']].corr(method='pearson')`,
                    rawData: corr,
                },
                lineage: {
                    sourceTable: 'active_dataset',
                    transformations: ['pearson correlation'],
                },
            });
        });
    }

    // Quality Metrics Evidence
    if (enhancedAnalytics.quality_metrics) {
        const qm = enhancedAnalytics.quality_metrics;

        evidence.push({
            id: 'completeness',
            type: 'quality',
            claim: `Data Completeness: ${qm.overall_completeness?.toFixed(1)}%`,
            proof: {
                python: `(df.notna().sum().sum() / (df.shape[0] * df.shape[1])) * 100`,
                rawData: qm,
            },
            lineage: {
                sourceTable: 'active_dataset',
                transformations: ['completeness calculation'],
            },
        });
    }

    // Feature Importance Evidence
    if (enhancedAnalytics.feature_importance?.feature_importance) {
        enhancedAnalytics.feature_importance.feature_importance.slice(0, 5).forEach((feat: any, index: number) => {
            evidence.push({
                id: `feature-${index}`,
                type: 'predictive_drivers',
                claim: `${feat.feature}: ${feat.importance?.toFixed(3)} importance`,
                proof: {
                    python: `# Random Forest Feature Importance\nmodel.feature_importances_[${index}]`,
                    rawData: feat,
                },
                lineage: {
                    sourceTable: 'active_dataset',
                    transformations: ['feature engineering', 'random forest training', 'importance extraction'],
                },
            });
        });
    }

    return evidence;
}
