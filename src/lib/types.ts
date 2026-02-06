export interface UploadResponse {
  run_id: string;
  filename: string;
  row_count: number;
  column_count: number;
  size_bytes: number;
  identity: {
    columns: string[];
    dtypes: Record<string, string>;
    sample_values: Record<string, unknown>;
  };
}

export interface TaskIntent {
  primary_question: string;
  decisions_to_drive: string;
  audience: string;
  time_horizon: string;
}

export interface AnalyzeResponse {
  run_id: string;
  status: string;
}

export interface RunStatus {
  run_id: string;
  status: "running" | "completed" | "failed" | "pending";
  current_step: string;
  current_step_index: number;
  total_steps: number;
  steps_completed: string[];
  progress_pct: number;
  elapsed_seconds: number;
}

export interface Insight {
  title: string;
  finding: string;
  why_it_matters: string;
  recommendation: string;
  impact_score: number;
  confidence: string;
  category: string;
}

export interface Hypothesis {
  finding_title: string;
  hypothesis_type: "charitable" | "suspicious" | "wild";
  hypothesis: string;
  confidence: number;
  is_red_flag: boolean;
}

export interface Snapshot {
  run_id: string;
  status: string;
  identity: {
    columns: string[];
    dtypes: Record<string, string>;
    row_count?: number;
    column_count?: number;
  };
  deep_insights: {
    insights: Insight[];
    headline_insight?: Insight;
    recommendations?: string[];
  };
  hypotheses: {
    hypotheses: Hypothesis[];
    red_flags?: Hypothesis[];
  };
  executive_narrative: {
    markdown?: string;
    headline: string;
    narrative: string;
  };
  trust: {
    overall_confidence: number;
    level: string;
  };
  report_markdown: string;
}

export interface RunsListResponse {
  runs: string[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export const PIPELINE_STEPS = [
  { key: "type_identifier", label: "Detecting data types" },
  { key: "scanner", label: "Profiling dataset" },
  { key: "interpreter", label: "Understanding schema" },
  { key: "validator", label: "Validating data quality" },
  { key: "overseer", label: "Task planning" },
  { key: "regression", label: "Building models" },
  { key: "time_series", label: "Analyzing trends" },
  { key: "sentry", label: "Detecting anomalies" },
  { key: "personas", label: "Identifying segments" },
  { key: "fabricator", label: "Engineering features" },
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
