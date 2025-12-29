import { useEffect, useState } from "react";

interface DiagnosticsResponse {
  mode?: string;
  validation?: any;
  identity?: any;
  confidence?: any;
  reasons?: string[];
}

export function useDiagnostics(runId?: string) {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }
    const fetchDiagnostics = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_ACE_API_BASE_URL || "http://localhost:8001";
        const res = await fetch(`${apiUrl}/runs/${runId}/diagnostics`);
        if (!res.ok) {
          throw new Error(`Failed to fetch diagnostics: ${res.statusText}`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnostics();
  }, [runId]);

  return { data, loading, error };
}

