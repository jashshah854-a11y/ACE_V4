import { ReportDataResult } from "@/types/reportTypes";
import { ReportViewModel } from "./reportViewModel";

/**
 * REPORT GUARD SYSTEM
 * 
 * A defensive layer that ensures the ReportDataResult object is completely safe
 * for consumption by UI components. It fills in missing properties with safe defaults
 * to prevent "Cannot read properties of undefined" runtime crashes.
 */

const SAFE_EXECUTIVE_BRIEF = {
    purpose: "Analysis in progress...",
    keyFindings: ["Processing data..."],
    recommendedAction: "Review full metrics.",
    confidenceVerdict: "Pending",
    risks: [],
    timeline: "TBD"
};

const SAFE_VIEW_MODEL: ReportViewModel = {
    headline: "Report Analysis",
    subheadline: "Processing insights...",
    metricCards: [],
    sections: [],
    executiveBrief: [], // String array format
    meta: {
        dataQuality: 0,
        confidence: 0,
        runId: "unknown",
        date: new Date().toLocaleDateString()
    },
    traceability: {
        textSegments: []
    }
};

export function ensureSafeReport(data: Partial<ReportDataResult> | null | undefined): ReportDataResult {
    if (!data) {
        // Return a completely empty but safe object
        return createSafeDefaults();
    }

    // Defensive copy and deep merge with defaults
    return {
        ...createSafeDefaults(),
        ...data,
        // Deep merge specific critical objects
        metrics: { ...createSafeDefaults().metrics, ...data.metrics },
        executiveBrief: { ...SAFE_EXECUTIVE_BRIEF, ...data.executiveBrief },
        viewModel: {
            ...SAFE_VIEW_MODEL,
            ...data.viewModel,
            meta: { ...SAFE_VIEW_MODEL.meta, ...(data.viewModel?.meta || {}) },
            traceability: {
                textSegments: data.viewModel?.traceability?.textSegments || []
            }
        },
        runContext: { ...createSafeDefaults().runContext, ...data.runContext },
        narrativeSummary: { ...createSafeDefaults().narrativeSummary, ...data.narrativeSummary },
        profile: data.profile || createSafeDefaults().profile,
    };
}

function createSafeDefaults(): ReportDataResult {
    return {
        metrics: {
            totalRows: 0,
            columnCount: 0,
            completionRate: 0,
            anomalyCount: 0,
            confidenceLevel: 0,
            dataQualityScore: 0,
            processingTimeMs: 0
        },
        progressMetrics: { completed: 0, total: 0, percent: 0 },
        sections: [],
        segmentData: {},
        compositionData: {},
        measurableSegments: [],
        clusterMetrics: { overview: { coherence: 0, separation: 0, stability: 0 }, clusters: [] },
        personas: [],
        outcomeModel: { targetField: "", modelType: "", accuracy: 0, featureImportance: [] },
        anomalies: { global: [], fields: {} },
        executiveBrief: SAFE_EXECUTIVE_BRIEF,
        conclusion: { summary: "", nextSteps: [] },
        heroInsight: { keyInsight: "Analysis Ready", impactScore: 0, category: "general" },
        mondayActions: [],
        segmentComparisonData: [],
        keyTakeaways: [],
        confidenceValue: 0,
        dataQualityValue: 0,
        limitationsMode: false,
        safeMode: false,
        hideActions: false,
        shouldEmitInsights: false,
        hasTimeField: false,
        taskContractSection: null,
        decisionSection: null,
        decisionSummary: "",
        taskContractSummary: "",
        filteredSections: [],
        evidenceSections: [],
        uncertaintySignals: [],
        narrativeSummary: { wins: [], risks: [], meaning: [] },
        runContext: { mode: "standard", freshness: "Unknown", scopeLimits: [] },
        identityStats: { rows: 0, completeness: 0, confidence: 0 },
        highlights: [],
        primaryQuestion: "",
        outOfScopeDimensions: [],
        scoredSections: [],
        governanceWarnings: [],
        scopeLocks: [],
        guidanceNotes: [],
        governingThought: "",
        governingTrust: undefined,
        narrativeModules: [],
        appendixModules: [],
        syntheticTimeColumn: undefined,
        enhancedAnalytics: null,
        analyticsLoading: false,
        diagnostics: null,
        modelArtifacts: null,
        viewModel: SAFE_VIEW_MODEL,
        profile: { columns: {}, numericColumns: [] }
    };
}
