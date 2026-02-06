export interface SchemaColumn {
  name: string;
  type: string;
  sample: string;
}

export interface DatasetPreview {
  row_count: number;
  column_count: number;
  file_type: string;
  schema_map: SchemaColumn[];
  quality_score: number;
  critical_gaps: string[];
  detected_capabilities: {
    has_financial_columns: boolean;
    has_time_series: boolean;
    has_categorical: boolean;
    has_numeric: boolean;
  };
  warnings: string[];
}

export interface TaskIntent {
  primary_question: string;
  decision_context: string;
  success_criteria: string;
  required_output_type: "diagnostic" | "descriptive" | "predictive";
  constraints?: string;
  confidence_threshold?: number;
}

export interface RunResponse {
  run_id: string;
  message: string;
  status: string;
}

export interface StepDetail {
  name: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  started_at?: string;
  completed_at?: string;
  runtime_seconds?: number;
}

export interface RunStatus {
  run_id: string;
  status: "running" | "completed" | "complete" | "failed" | "queued" | "pending";
  current_step: string;
  current_stage?: string;
  next_step?: string;
  steps_completed: string[];
  failed_steps: string[];
  steps: Record<string, StepDetail>;
  progress: number;
  stage_progress?: number;
  completed_steps: number;
  total_steps: number;
  start_epoch?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: string;
}

export interface SmartNarrative {
  executive_summary: string;
  key_findings: string[];
  data_story: string;
  recommendations: Recommendation[];
  warnings: string[];
  generated_at?: string;
  model_used?: string;
}

export interface GovInsight {
  title?: string;
  finding?: string;
  confidence?: string;
  category?: string;
  evidence?: string;
  [key: string]: unknown;
}

export interface GovernedReport {
  mode?: string;
  allowed_sections?: string[];
  data_type?: string;
  analysis_intent?: string;
  confidence?: number;
  limitations?: string[];
  insights: GovInsight[];
  task_contract?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}

export interface TrustComponent {
  score: number | null;
  status: string;
  evidence: string[];
  notes: string;
}

export interface Trust {
  overall_confidence: number;
  components: Record<string, TrustComponent>;
  applied_caps?: Array<{ code: string; max: number; evidence: string[] }>;
}

export interface CuratedKPIs {
  rows: number;
  columns: number;
  data_quality_score: number;
  completeness: number;
  [key: string]: unknown;
}

export interface IdentityBlock {
  identity: {
    source_path?: string;
    row_count: number;
    column_count: number;
    columns: string[];
    data_type?: string;
    quality?: string;
    quality_score?: number;
    [key: string]: unknown;
  };
  profile?: Record<string, unknown>;
  summary?: {
    row_count: number;
    column_count: number;
    data_type?: string;
    quality?: string;
    [key: string]: unknown;
  };
}

export interface EnhancedAnalytics {
  analysis_mode?: string;
  quality_score?: number;
  correlation_analysis?: Record<string, unknown>;
  distribution_analysis?: Record<string, unknown>;
  quality_metrics?: Record<string, unknown>;
  business_intelligence?: Record<string, unknown>;
  feature_importance?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Snapshot {
  run_id: string;
  generated_at?: string;
  identity: IdentityBlock;
  curated_kpis: CuratedKPIs;
  trust: Trust;
  report_markdown: string;
  governed_report: GovernedReport;
  smart_narrative: SmartNarrative;
  enhanced_analytics: EnhancedAnalytics;
  model_artifacts?: Record<string, unknown>;
  evidence_map?: Record<string, unknown>;
  run_warnings?: string[];
  render_policy?: Record<string, unknown>;
}

export interface RunsListResponse {
  runs: string[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const PIPELINE_STEPS = [
  { key: "ingestion", label: "Data ingestion" },
  { key: "type_identifier", label: "Detecting data types" },
  { key: "scanner", label: "Profiling dataset" },
  { key: "interpreter", label: "Understanding schema" },
  { key: "validator", label: "Validating data quality" },
  { key: "overseer", label: "Clustering & segmentation" },
  { key: "regression", label: "Building models" },
  { key: "time_series", label: "Analyzing trends" },
  { key: "sentry", label: "Detecting anomalies" },
  { key: "personas", label: "Generating personas" },
  { key: "fabricator", label: "Strategy generation" },
  { key: "raw_data_sampler", label: "Sampling data" },
  { key: "deep_insight", label: "Finding patterns" },
  { key: "dot_connector", label: "Connecting insights" },
  { key: "hypothesis_engine", label: "Generating theories" },
  { key: "so_what_deepener", label: "Analyzing implications" },
  { key: "story_framer", label: "Crafting narrative" },
  { key: "executive_narrator", label: "Polishing report" },
  { key: "expositor", label: "Finalizing output" },
  { key: "trust_evaluation", label: "Scoring confidence" },
] as const;
