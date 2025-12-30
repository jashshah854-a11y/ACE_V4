import { LucideIcon, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Brain, Target, Shield, Activity, Zap } from "lucide-react";

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
    const cleanSummary = summaryText.replace(/#{1,3}\s/g, "").replace(/\*\*/g, ""); // Remove md headers/bold
    const sentences = cleanSummary.split(". ").filter(s => s.trim().length > 0);
    const headline = sentences[0]?.length < 100 ? sentences[0] : "Analysis Complete: Key Strategic Insights Identified";
    const subheadline = sentences.length > 1 ? sentences[1] : "Review the full report for details.";

    // Extract brief (3 bullets) logic - Mocking or parsing lists if available
    const dataQualityScore = runData.diagnostics?.data_quality?.score ?? 0;
    const executiveBrief = [
        "Analysis complete with high confidence.",
        `Data quality score of ${(dataQualityScore * 100).toFixed(0)}%.`,
        sentences.length > 2 ? sentences[2] : "Critical trends identified in performance metrics."
    ];

    // 2. Build Metric Cards
    const metrics: MetricCardData[] = [];

    // Rows/Columns (Safe parse)
    let rowCount = 0;
    try {
        const metadataSection = runData.sections?.find((s: BackendReportSection) => s.id === "run-metadata");
        if (metadataSection?.content) {
            // Attempt to parse JSON content from the metadata section
            const parsed = JSON.parse(metadataSection.content);
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
        }
    } catch (e) {
        console.warn("[ReportViewModel] Failed to parse metadata section", e);
    }

    // Quality Score
    metrics.push({
        label: "Data Clarity",
        value: `${(dataQualityScore * 100).toFixed(0)}%`,
        status: dataQualityScore > 0.8 ? "success" : (dataQualityScore > 0.5 ? "warning" : "risk"),
        trend: dataQualityScore > 0.8 ? "up" : "neutral",
        icon: Shield
    });

    // Confidence
    const confidence = runData.confidence_score || 0;
    metrics.push({
        label: "AI Confidence",
        value: `${(confidence * 100).toFixed(0)}%`,
        status: confidence > 0.8 ? "success" : "warning",
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
            dataQuality: dataQualityScore,
            confidence: confidence,
            runId: runData.run_id,
            date: new Date(runData.created_at).toLocaleDateString()
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
    // Adapter to convert useReportData's internal format to StoryViewData
    // This is a simplified mapping to satisfy the build and provide basic legacy support

    return {
        headline: data.decisionSummary || "Report Analysis",
        subheadline: data.primaryQuestion || "Key insights from your data.",
        metricCards: [], // data.metrics could be mapped here if needed
        sections: (data.sections || []).map((s: any) => ({
            id: s.id || "section",
            title: s.title || "Section",
            content: s.content || "",
            sentiment: "neutral",
            type: "narrative"
        })),
        executiveBrief: [],
        meta: {
            dataQuality: 0,
            confidence: data.confidenceValue || 0,
            runId: "legacy",
            date: new Date().toLocaleDateString()
        }
    };
}
