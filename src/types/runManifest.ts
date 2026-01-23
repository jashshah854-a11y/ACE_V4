export type ManifestStepStatus = "not_started" | "running" | "success" | "failed" | "skipped";

export interface RunManifestStep {
  status: ManifestStepStatus;
  started_at?: string | null;
  ended_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface RunManifestArtifact {
  artifact_id: string;
  artifact_type: string;
  produced_by_step: string;
  status: string;
  valid: boolean;
  validation_errors: unknown[];
  validation_warnings: unknown[];
  input_fingerprint: string;
  created_at: string;
}

export interface RunManifestWarning {
  warning_code: string;
  severity: string;
  message: string;
  related_step?: string | null;
  blocking?: boolean;
}

export interface RunManifestRenderPolicy {
  allow_report: boolean;
  allow_regression_sections: boolean;
  allow_forecasting: boolean;
  allow_simulation: boolean;
  allow_personas: boolean;
  allow_strategies: boolean;
  allow_anomalies: boolean;
  allow_correlation_analysis: boolean;
  allow_distribution_analysis: boolean;
  allow_quality_metrics: boolean;
  allow_business_intelligence: boolean;
  allow_feature_importance: boolean;
}

import type { TrustModel } from "@/types/trust";

export interface RunManifest {
  manifest_version: string;
  run_id: string;
  created_at: string;
  pipeline_version: string;
  code_commit_hash: string;
  dataset_fingerprint: string;
  steps: Record<string, RunManifestStep>;
  artifacts: Record<string, RunManifestArtifact>;
  warnings: RunManifestWarning[];
  trust?: TrustModel | null;
  render_policy: RunManifestRenderPolicy;
  updated_at: string;
}
