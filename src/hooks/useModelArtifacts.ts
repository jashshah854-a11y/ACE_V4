import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";

interface ModelArtifacts {
  feature_importance?: any;
  coefficients?: any;
}

export function useModelArtifacts(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<ModelArtifacts>(runId, "model-artifacts");
  return { data, loading, error };
}

