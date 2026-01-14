import { useEffect } from "react";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import { setDiagnosticsCache, type DiagnosticsCachePayload } from "@/lib/localStorage";

interface DiagnosticsResponse {
  mode?: string;
  validation?: any;
  identity?: any;
  confidence?: any;
  reasons?: string[];
}

export function useDiagnostics(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<DiagnosticsResponse>(runId, "diagnostics");

  useEffect(() => {
    if (!runId || !data) return;
    setDiagnosticsCache(runId, data as unknown as DiagnosticsCachePayload);
  }, [runId, data]);

  return { data, loading, error };
}
