import { LucideIcon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Brain, Target, Shield, Activity, Zap } from "lucide-react";
import type { TrustScore } from "@/types/trust";

// --- Types ---

export interface StoryViewData {
    headline: string;
    subheadline: string;
    metricCards: MetricCardData[];
    sections: StorySection[];
    executiveBrief: string[];
    meta: {
        dataQuality: number;
        confidence: number;
        runId: string;
        date: string;
    };
    traceability?: {
        textSegments: Array<{ text: string; evidenceId: string }>;
    };
}

export interface MetricCardData {
    label: string;
    value: string;
    trend?: "up" | "down" | "neutral";
    status: "success" | "warning" | "risk" | "neutral";
    icon?: LucideIcon;
}

export interface StorySection {
    id: string;
    title: string;
    content: string; // HTML/Markdown ready
    listItems?: string[]; // For checklists
    sentiment: "positive" | "negative" | "neutral" | "caution";
    type: "narrative" | "key_insight" | "recommendation";
    impact?: string; // "Why this matters"
    trust?: TrustScore;
}

// --- Jargon Dictionary ---

const JARGON_MAP: Record<string, string> = {
    "correlation_outputs": "Key Relationships",
    "target_variance": "Variability",
    "null_values": "Missing Data",
    "cardinality": "Uniqueness",
    "outliers_detected": "Anomalies Found",
    "feature_importance": "Drivers of Impact",
    "marketing_performance": "Marketing Performance",
    "general_analysis": "General Analysis",
};

// --- Helper to extract list items from markdown ---
function extractListItems(markdown: string): string[] {
    const lines = markdown.split('\n');
    return lines
        .filter(line => line.trim().match(/^(\d+\.|-|\*)\s/)) // Match "1. " or "- " or "* "
        .map(line => line.replace(/^(\d+\.|-|\*)\s/, '').trim());
}

// --- Transformer ---
import { BackendRunData, BackendReportSection } from "@/types/backend-schema";
import { z } from "zod";

const MetadataSchema = z.object({
    row_count: z.number().optional(),
    column_count: z.number().optional(),
});

export function transformToStory(runData: BackendRunData | null | undefined): StoryViewData {
    if (!runData) {
        return createEmptyStory();
    }

    // 1. Extract Headline & Brief
    const execSummarySection = runData.sections?.find(
        (s: BackendReportSection) => s.id === "executive-summary" || s.title?.toLowerCase().includes("executive")
    );
    const summaryText = execSummarySection ? execSummarySection.content : "No executive summary available.";

    // Naive headline extraction: First sentence or split by newline
    // Naive headline extraction: First sentence or split by newline
    const cleanSummary = summaryText.replace(/#{1,3}\s/g, "").replace(/\*\*/g, ""); // Remove md headers/bold
    const sentences = cleanSummary.split(". ").filter(s => s.trim().length > 0);

    let headline = sentences[0]?.length < 100 ? sentences[0] : "Analysis Complete: Key Strategic Insights Identified";

    // UI Audit Fix: Prevent "Validation mode" system messages from becoming giant headlines
    if (headline.toLowerCase().includes("validation mode") || headline.toLowerCase().includes("limitations")) {
        headline = "Data Analysis Report";
    }

    const subheadline = sentences.length > 1 ? sentences[1] : "Review the full report for details.";

    // Data Date Fix
    let dateStr = "Recent";
    try {
        if (runData.created_at) {
            const d = new Date(runData.created_at);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
        }
    } catch (e) { console.warn("Date parse error", e); }

    // Extract brief (3 bullets) logic - Mocking or parsing lists if available
    const rawDataQualityScore = runData.diagnostics?.data_quality?.score ?? 0;
    const normalizedDataQuality = typeof rawDataQualityScore === 'number'
        ? (rawDataQualityScore > 1 ? rawDataQualityScore : rawDataQualityScore * 100)
        : 0;
    const dataQualityRatio = normalizedDataQuality / 100;

    // Filter out system validation messages from the brief to reduce redundancy
    const contentBullets = sentences.slice(2, 5).filter(s =>
        !s.toLowerCase().includes("validation mode") &&
        !s.toLowerCase().includes("limitations")
    );

    const executiveBrief = [
        `Analysis Status: ${dataQualityRatio > 0.5 ? "Complete" : "Limitations Applied"}`,
        `Data Quality Score: ${normalizedDataQuality.toFixed(0)}%`,
        ...contentBullets
    ].slice(0, 3);

    if (executiveBrief.length < 3) {
        executiveBrief.push("Explore the full report below for detailed metrics.");
    }

    // 2. Build Metric Cards
    const metrics: MetricCardData[] = [];

    // Rows/Columns (Safe parse)
    let rowCount = 0;
    try {
        const metadataSection = runData.sections?.find((s: BackendReportSection) => s.id === "run-metadata");
        if (metadataSection?.content) {
            // Attempt to parse JSON content from the metadata section
            try {
                let metadataPayload = metadataSection.content.trim();
                if (metadataPayload.startsWith('```')) {
                    metadataPayload = metadataPayload.replace(/^```json/iu, '').replace(/```$/u, '').trim();
                }
                const parsed = JSON.parse(metadataPayload);
                const result = MetadataSchema.safeParse(parsed);
                if (result.success) {
                    rowCount = result.data.row_count || 0;
                    metrics.push({
                        label: "Total Records",
                        value: rowCount.toLocaleString(),
                        status: "neutral",
                        icon: Activity
                    });
                }
            } catch (e) {
                console.warn("[ReportViewModel] Failed to parse metadata section content as JSON", e);
                // Fallback: rowCount remains 0, and no metric card is added for it.
            }
        }
    } catch (e) {
        console.warn("[ReportViewModel] Error accessing metadata section", e);
    }

    // Quality Score
    metrics.push({
        label: "Data Clarity",
        value: `${normalizedDataQuality.toFixed(0)}%`,
        status: dataQualityRatio > 0.8 ? "success" : (dataQualityRatio > 0.5 ? "warning" : "risk"),
        trend: dataQualityRatio > 0.8 ? "up" : "neutral",
        icon: Shield
    });

    // Confidence
    const rawConfidence = runData.confidence_score || 0;
    const normalizedConfidence = rawConfidence > 1 ? rawConfidence : rawConfidence * 100;
    const confidenceRatio = normalizedConfidence / 100;
    metrics.push({
        label: "AI Confidence",
        value: `${normalizedConfidence.toFixed(0)}%`,
        status: confidenceRatio > 0.8 ? "success" : "warning",
        icon: Brain
    });

    // 3. Transform Sections
    const storySections: StorySection[] = runData.sections
        .filter((s: BackendReportSection) => s.type !== "metadata" && s.type !== "diagnostics" && s.id !== "executive-summary") // We used executive summary for headline
        .map((s: BackendReportSection) => {
            let title = s.title;
            let content = s.content;

            // Apply Jargon Map
            Object.keys(JARGON_MAP).forEach(key => {
                const regex = new RegExp(key, "gi");
                content = content.replace(regex, JARGON_MAP[key]);
                title = title.replace(regex, JARGON_MAP[key]);
            });

            // Determine Sentiment
            let sentiment: StorySection["sentiment"] = "neutral";
            const lowerContent = content.toLowerCase();
            if (lowerContent.includes("risk") || lowerContent.includes("decline") || lowerContent.includes("drop") || lowerContent.includes("issue")) sentiment = "negative";
            if (lowerContent.includes("growth") || lowerContent.includes("improvement") || lowerContent.includes("success") || lowerContent.includes("gain")) sentiment = "positive";
            if (lowerContent.includes("caution") || lowerContent.includes("monitor") || lowerContent.includes("audit")) sentiment = "caution";

            const isRecommendation = title.toLowerCase().includes("recommendation") || s.type === "recommendation";
            if (isRecommendation) sentiment = "positive"; // Actions are generally positive opportunities

            // Extract List Items (if recommendation)
            const listItems = isRecommendation ? extractListItems(content) : undefined;

            // Mock Impact Statement (In real app, AI would generate this field separately)
            let impact = undefined;
            if (sentiment === 'negative') impact = "Ignoring this trend could lead to reduced efficiency in the coming quarter.";
            if (sentiment === 'positive') impact = "Capitalizing on this now acts as a force multiplier for overall ROI.";
            if (sentiment === 'caution') impact = "Early intervention here prevents minor issues from becoming blockers.";

            return {
                id: s.id,
                title,
                content,
                listItems,
                sentiment,
                type: isRecommendation ? "recommendation" : "narrative",
                impact
            };
        });

    // Add the Executive Summary as the first narrative section if we didn't fully consume it
    // Actually, let's keep it as the "Overview" section but cleaned up
    if (execSummarySection) {
        storySections.unshift({
            id: "story-overview",
            title: "Executive Overview",
            content: execSummarySection.content, // Keep original md for the body
            sentiment: "neutral",
            type: "narrative"
        });
    }

    return {
        headline,
        subheadline,
        metricCards: metrics,
        sections: storySections,
        executiveBrief,
        meta: {
            dataQuality: dataQualityRatio,
            confidence: confidenceRatio,
            runId: runData.run_id,
            date: dateStr
        }
    };
}

function createEmptyStory(): StoryViewData {
    return {
        headline: "Waiting for Analysis...",
        subheadline: "Please verify your task contract and data source.",
        metricCards: [],
        sections: [],
        executiveBrief: [],
        meta: { dataQuality: 0, confidence: 0, runId: "---", date: "---" }
    };
}
// --- Legacy / Adapter Exports for useReportData ---

export interface ReportViewModel extends StoryViewData { }

export function filterSuppressedSections(sections: any[]) {
    return sections.filter(s => {
        const title = s.title?.toLowerCase() || "";
        const type = s.type?.toLowerCase() || "";
        return !title.includes("metadata") && !type.includes("diagnostic");
    });
}

export function transformAPIResponse(data: any): ReportViewModel {
    const normalizedConfidence = typeof data?.confidenceValue === 'number'
        ? data.confidenceValue
        : typeof data?.metrics?.confidenceLevel === 'number'
            ? data.metrics.confidenceLevel
            : 0;
    const normalizedDataQuality = typeof data?.metrics?.dataQualityScore === 'number'
        ? data.metrics.dataQualityScore
        : typeof data?.dataQualityValue === 'number'
            ? data.dataQualityValue
            : 0;

    const pseudoRun: BackendRunData = {
        run_id: data.runId || 'legacy',
        created_at: new Date().toISOString(),
        confidence_score: normalizedConfidence / 100,
        sections: (data.sections || []).map((s: any, index: number) => ({
            id: s.id || `section-${index}`,
            title: s.title || `Section ${index + 1}`,
            type: (s.type as string) || 'narrative',
            content: s.content || ''
        })),
        diagnostics: {
            data_quality: { score: normalizedDataQuality / 100 }
        }
    } as BackendRunData;

    const story = transformToStory(pseudoRun);

    const metricCards: MetricCardData[] = [];
    if (typeof normalizedDataQuality === 'number' && !Number.isNaN(normalizedDataQuality)) {
        const ratio = normalizedDataQuality / 100;
        metricCards.push({
            label: 'Data Clarity',
            value: `${normalizedDataQuality.toFixed(0)}%`,
            status: ratio > 0.8 ? 'success' : ratio > 0.5 ? 'warning' : 'risk',
            trend: ratio > 0.8 ? 'up' : 'neutral',
            icon: Shield
        });
    }
    if (typeof normalizedConfidence === 'number' && !Number.isNaN(normalizedConfidence)) {
        const ratio = normalizedConfidence / 100;
        metricCards.push({
            label: 'AI Confidence',
            value: `${normalizedConfidence.toFixed(0)}%`,
            status: ratio > 0.8 ? 'success' : 'warning',
            icon: Brain
        });
    }
    if (typeof data?.metrics?.recordsProcessed === 'number') {
        metricCards.push({
            label: 'Records Processed',
            value: data.metrics.recordsProcessed.toLocaleString(),
            status: 'neutral',
            icon: Activity
        });
    }
    if (typeof data?.metrics?.anomalyCount === 'number') {
        metricCards.push({
            label: 'Anomalies',
            value: data.metrics.anomalyCount.toLocaleString(),
            status: data.metrics.anomalyCount > 0 ? 'warning' : 'success',
            icon: AlertTriangle
        });
    }

    if (metricCards.length) {
        story.metricCards = metricCards;
    }

    const executiveBriefEntries: string[] = [];
    if (data.executiveBrief?.purpose) executiveBriefEntries.push(data.executiveBrief.purpose);
    if (Array.isArray(data.executiveBrief?.keyFindings)) {
        executiveBriefEntries.push(...data.executiveBrief.keyFindings);
    }
    if (data.executiveBrief?.recommendedAction) {
        executiveBriefEntries.push(`Action: ${data.executiveBrief.recommendedAction}`);
    }
    if (executiveBriefEntries.length) {
        story.executiveBrief = executiveBriefEntries.filter(Boolean).slice(0, 3);
    }

    if (data.decisionSummary) {
        story.headline = data.decisionSummary;
    } else if (data.heroInsight?.keyInsight) {
        story.headline = data.heroInsight.keyInsight;
    }

    if (data.primaryQuestion) {
        story.subheadline = data.primaryQuestion;
    }

    story.meta = {
        dataQuality: normalizedDataQuality / 100,
        confidence: normalizedConfidence / 100,
        runId: pseudoRun.run_id,
        date: story.meta.date || new Date().toLocaleDateString()
    };

    return story;
}
