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
    profile?: ReportProfile;
    governanceWarnings: string[];
    syntheticTimeColumn?: string;
    guidanceNotes: GuidanceNote[];

    // External data
    enhancedAnalytics: EnhancedAnalyticsData | null;
    analyticsLoading: boolean;
    diagnostics: any;
    modelArtifacts: any;
    viewModel: ReportViewModel;
}

export type GuidanceSeverity = "info" | "warning" | "critical";

export interface GuidanceNote {
    id: string;
    message: string;
    severity: GuidanceSeverity;
    source?: string;
}

export interface CorrelationPair {
    feature1: string;
    feature2: string;
    pearson: number;
    spearman: number;
    strength?: string;
    direction?: string;
}

export interface FeatureImportanceItem {
    feature: string;
    importance: number;
}

export interface EnhancedAnalyticsData {
    mode?: string;
    data_freshness?: string;
    business_intelligence?: BusinessIntelligence;
    feature_importance?: {
        available: boolean;
        feature_importance?: FeatureImportanceItem[];
        target?: string;
        task_type?: string;
        insights?: string[];
    };
    quality_metrics?: {
        available?: boolean;
        overall_completeness?: number;
        total_records?: number;
        columns?: Record<string, any>;
        insights?: string[];
    } | null;
    correlation_analysis?: {
        available: boolean;
        strong_correlations?: CorrelationPair[];
        total_correlations?: number;
        insights?: string[];
    };
    distribution_analysis?: {
        available: boolean;
        distributions?: Record<string, any>;
        insights?: string[];
    };
}

export interface BusinessIntelligence {
    available: boolean;
    value_metrics?: {
        total_value: number;
        avg_value: number;
        median_value: number;
        value_concentration: number; // Gini coefficient
    };
    clv_proxy?: {
        avg_value_per_record: number;
        estimated_total_value: number;
        high_value_count: number;
    };
    churn_risk?: {
        at_risk_count: number;
        at_risk_percentage: number;
        activity_column: string;
    };
    segment_value?: Array<{
        segment: string;
        total_value: number;
        value_contribution_pct: number;
    }>;
    insights?: string[];
}

export interface FeatureImportance {
    available: boolean;
    target?: string;
    task_type?: "regression" | "classification";
    feature_importance?: Array<{
        feature: string;
        importance: number;
        rank: number;
    }>;
    insights?: string[];
}

export interface ReportProfile {
    columns: Record<string, ColumnProfile>;
    numericColumns: string[];
}

export interface ColumnProfile {
    dtype?: string;
    type?: string;
    null_pct?: number;
    [key: string]: any;
}

export interface CuratedKpiArtifactEntry {
    id?: string;
    label: string;
    value?: number;
    display_value?: string;
    unit?: string;
    delta_value?: number;
    delta_pct?: number;
    delta_label?: string;
    description?: string;
    confidence?: number;
    status?: "success" | "warning" | "risk" | "neutral";
    trend?: "up" | "down" | "flat";
    source_columns?: string[];
    format?: "currency" | "percent" | "integer" | "decimal";
}

export interface CuratedKpiArtifact {
    generated_at?: string;
    source?: string;
    summary?: string;
    primary?: CuratedKpiArtifactEntry[];
    supporting?: CuratedKpiArtifactEntry[];
    kpis?: CuratedKpiArtifactEntry[];
}

export interface CuratedKpiCardData {
    id: string;
    label: string;
    value: string;
    status?: "success" | "warning" | "risk" | "neutral";
    trend?: "up" | "down" | "flat";
    deltaLabel?: string;
    description?: string;
    confidenceLabel?: string;
    sourceColumns?: string[];
    origin?: "artifact" | "fallback";
}

