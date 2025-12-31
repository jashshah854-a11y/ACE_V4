import { ReportViewModel } from "@/lib/reportViewModel";

export interface ReportDataResult {
    // Core extracted data
    metrics: any; // Simplified types for shared file to avoid importing everything
    progressMetrics: any;
    sections: any[];
    segmentData: any;
    compositionData: any;
    measurableSegments: any[];
    clusterMetrics: any;
    personas: any[];
    outcomeModel: any;
    anomalies: any;

    // Narrative components
    executiveBrief: any;
    conclusion: any;
    heroInsight: any;
    mondayActions: any;
    segmentComparisonData: any;
    keyTakeaways: string[];

    // Computed values
    confidenceValue: number | undefined;
    dataQualityValue: number | undefined;
    limitationsMode: boolean;
    safeMode: boolean;
    hideActions: boolean;
    shouldEmitInsights: boolean;
    hasTimeField: boolean;

    // Sections
    taskContractSection: any;
    decisionSection: any;
    decisionSummary: string | undefined;
    taskContractSummary: string | undefined;
    filteredSections: any[];
    evidenceSections: any[];
    uncertaintySignals: string[];
    narrativeSummary: { wins: string[]; risks: string[]; meaning: string[] };
    runContext: { mode: string; freshness: string; scopeLimits: string[] };
    identityStats: { rows: any; completeness: any; confidence: any };
    highlights: { label: string; tone: "default" | "warn" | "ok" }[];
    primaryQuestion?: string;
    outOfScopeDimensions: string[];
    scoredSections: any[];

    // External data
    enhancedAnalytics: any;
    analyticsLoading: boolean;
    diagnostics: any;
    modelArtifacts: any;
    viewModel: ReportViewModel;
}
