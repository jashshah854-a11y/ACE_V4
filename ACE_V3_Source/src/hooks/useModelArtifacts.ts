import { useEffect, useState } from "react";

interface ModelArtifacts {
  feature_importance?: any;
  coefficients?: any;
}

const API_BASE =
  import.meta.env.VITE_ACE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8001";

export function useModelArtifacts(runId?: string) {
  const [data, setData] = useState<ModelArtifacts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }
    const fetchArtifacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/runs/${runId}/model-artifacts`);
        if (!res.ok) {
          if (res.status === 404) {
            setData(null);
            return;
          }
          throw new Error(`Failed to fetch model artifacts: ${res.statusText}`);
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
    fetchArtifacts();
  }, [runId]);

  return { data, loading, error };
}


