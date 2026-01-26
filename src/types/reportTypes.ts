import type { ReportViewModel } from "@/lib/reportViewModel";
import type { NarrativeModule } from "@/lib/meaningAssembler";
import type { TrustModel } from "@/types/trust";
import type { AnalysisIntent, ScopeConstraintDisplay, TargetCandidate } from "@/types/analysisIntent";
import type { RunManifest, RunManifestRenderPolicy } from "@/types/runManifest";

export type GuidanceSeverity = "info" | "warning" | "critical";

export interface GuidanceNote {
  id: string;
  message: string;
  severity: GuidanceSeverity;
  source?: string;
}

export interface ColumnProfile {
  dtype?: string;
  type?: string;
  null_pct?: number;
  [key: string]: any;
}

export interface ReportProfile {
  columns: Record<string, ColumnProfile>;
  numericColumns: string[];
}

export interface BusinessIntelligence {
  available: boolean;
  valid?: boolean;
  status?: "success" | "failed";
  errors?: any[];
  warnings?: any[];
  value_metrics?: {
    total_value: number;
    avg_value: number;
    median_value: number;
    value_concentration: number;
  };
  clv_proxy?: {
    avg_value_per_record: number;
    estimated_total_value: number;
    high_value_threshold?: number;
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
    [key: string]: any;
  }>;
  insights?: string[];
  [key: string]: any;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  rank?: number;
}

export interface ImportanceReport {
  valid?: boolean;
  status?: "success" | "failed";
  method?: string;
  scoring?: string;
  n_repeats?: number;
  target_column?: string;
  target_type?: "continuous" | "binary" | "multiclass";
  dataset_split?: {
    train_rows?: number;
    test_rows?: number;
  };
  features: Array<{
    feature: string;
    importance: number;
    ci_low?: number | null;
    ci_high?: number | null;
  }>;
}

export interface ModelFitReport {
  valid?: boolean;
  status?: "success" | "failed";
  model?: string;
  target_column?: string;
  target_type?: "continuous" | "binary" | "multiclass";
  metrics?: Record<string, number | null>;
  baseline_metrics?: Record<string, number | null>;
  dataset_split?: {
    train_rows?: number;
    test_rows?: number;
  };
}

export interface CollinearityReport {
  valid?: boolean;
  status?: "success" | "failed";
  vif_by_feature?: Record<string, number>;
  max_vif?: number | null;
  decision?: string;
}

export interface LeakageReport {
  valid?: boolean;
  status?: "success" | "failed";
  flagged_pairs?: any[];
  flagged_target_pairs?: any[];
  suppression_actions_taken?: string[];
}

export interface FeatureImportance {
  available: boolean;
  valid?: boolean;
  status?: "success" | "failed";
  errors?: any[];
  warnings?: any[];
  target?: string;
  task_type?: "regression" | "classification";
  feature_importance?: FeatureImportanceItem[];
  insights?: string[];
  confidence_interval?: [number, number];
  evidence_id?: string | null;
  reason?: string;
}

export interface CorrelationPair {
  feature1: string;
  feature2: string;
  pearson: number;
  spearman: number;
  pearson_ci_low?: number | null;
  pearson_ci_high?: number | null;
  n?: number;
  strength?: string;
  direction?: string;
  is_leakage?: boolean;
}

export interface EnhancedAnalyticsData {
  mode?: string;
  data_freshness?: string;
  analysis_mode?: string;
  business_intelligence?: BusinessIntelligence;
  feature_importance?: FeatureImportance;
  quality_metrics?: {
    available?: boolean;
    valid?: boolean;
    status?: "success" | "failed";
    errors?: any[];
    warnings?: any[];
    overall_completeness?: number;
    total_records?: number;
    columns?: Record<string, any>;
    insights?: string[];
  } | null;
  correlation_analysis?: {
    available: boolean;
    valid?: boolean;
    status?: "success" | "failed";
    errors?: any[];
    warnings?: any[];
    strong_correlations?: CorrelationPair[];
    total_correlations?: number;
    insights?: string[];
  };
  correlation_ci?: {
    available?: boolean;
    valid?: boolean;
    status?: "success" | "failed";
    errors?: any[];
    warnings?: any[];
    pairs?: Array<{
      feature1: string;
      feature2: string;
      pearson: number;
      ci_low?: number | null;
      ci_high?: number | null;
      n?: number;
    }>;
  } | null;
  distribution_analysis?: {
    available: boolean;
    valid?: boolean;
    status?: "success" | "failed";
    errors?: any[];
    warnings?: any[];
    distributions?: Record<string, any>;
    insights?: string[];
  };
  behavioral_clusters?: Array<Record<string, any>>;
  [key: string]: any;
}

export interface CuratedKpiArtifactEntry {
  id?: string;
  evidence_id?: string;
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
  evidenceId?: string;
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

export interface EvidenceSummary {
  id: string;
  title: string;
  method?: string;
  columns: string[];
  confidence?: number;
  scope?: string;
  sourceCode?: string;
  dataSource?: string;
  sourceNotes?: string;
  raw?: any;
}

export interface GovernedInsightSummary {
  id: string;
  claim?: string;
  agent?: string;
  severity?: string;
  metricName?: string;
  evidenceId?: string;
  columns?: string[];
  confidence?: number;
  impact?: string;
  evidence?: EvidenceSummary;
}

export interface ReportDataResult {
  metrics: any;
  progressMetrics: any;
  sections: any[];
  segmentData: any;
  compositionData: any;
  measurableSegments: any[];
  clusterMetrics: any;
  personas: any[];
  outcomeModel: any;
  anomalies: any;
  executiveBrief: any;
  conclusion: any;
  heroInsight: any;
  mondayActions: any;
  segmentComparisonData: any;
  keyTakeaways: string[];
  dataQualityValue?: number;
  limitationsMode: boolean;
  safeMode: boolean;
  hideActions: boolean;
  shouldEmitInsights: boolean;
  hasTimeField: boolean;
  taskContractSection: any;
  decisionSection: any;
  decisionSummary?: string;
  taskContractSummary?: string;
  filteredSections: any[];
  evidenceSections: any[];
  uncertaintySignals: string[];
  narrativeSummary: { wins: string[]; risks: string[]; meaning: string[] };
  runContext: { mode: string; freshness: string; scopeLimits: string[] };
  identityStats: { rows: any; completeness: any };
  highlights: { label: string; tone: "default" | "warn" | "ok" }[];
  primaryQuestion?: string;
  successCriteria?: string;
  outOfScopeDimensions: string[];
  scoredSections: Array<any>;
  governanceWarnings: string[];
  scopeLocks: { dimension: string; reason?: string }[];
  analysisIntent?: AnalysisIntent;
  targetCandidate?: TargetCandidate;
  scopeConstraints: ScopeConstraintDisplay[];
  profile?: ReportProfile;
  syntheticTimeColumn?: string;
  guidanceNotes: GuidanceNote[];
  runWarnings?: Array<{ code: string; message: string; details?: any }>;
  governingThought?: string;
  narrativeModules: NarrativeModule[];
  appendixModules: NarrativeModule[];
  enhancedAnalytics: EnhancedAnalyticsData | null;
  analyticsLoading: boolean;
  diagnostics: any;
  modelArtifacts: any;
  viewModel: ReportViewModel;
  evidenceMap: Record<string, EvidenceSummary>;
  governedInsights: GovernedInsightSummary[];
  trustModel?: TrustModel | null;
  runManifest?: RunManifest | null;
  manifestLoading: boolean;
  manifestCompatible: boolean;
  renderPolicy?: RunManifestRenderPolicy;
  viewPolicies?: RunManifest["view_policies"];
  analysisAllowed?: RunManifest["analysis_allowed"];
  analysisSuppressed?: RunManifest["analysis_suppressed"];
}


