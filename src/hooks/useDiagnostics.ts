import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";

interface DiagnosticsResponse {
  mode?: string;
  validation?: any;
  identity?: any;
  confidence?: any;
  reasons?: string[];
}

export function useDiagnostics(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<DiagnosticsResponse>(runId, "diagnostics");
  return { data, loading, error };
}

