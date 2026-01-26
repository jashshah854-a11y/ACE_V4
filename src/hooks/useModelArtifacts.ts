import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";

interface ModelArtifacts {
  importance_report?: any;
  regression_coefficients_report?: any;
  baseline_metrics?: any;
  model_fit_report?: any;
  collinearity_report?: any;
  leakage_report?: any;
  feature_governance_report?: any;
  feature_importance?: any;
  coefficients?: any;
}

export function useModelArtifacts(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<ModelArtifacts>(runId, "model-artifacts");
  return { data, loading, error };
}

