import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-client";

interface ModelArtifacts {
  feature_importance?: any;
  coefficients?: any;
}

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
        const apiUrl = import.meta.env.VITE_ACE_API_BASE_URL || "http://localhost:8001";
        const res = await fetch(`${apiUrl}/runs/${runId}/model-artifacts`);
        if (!res.ok) {
          if (res.status === 404) {
            setData(null);
            return;
          }
          throw new Error(`Failed to fetch model artifacts: ${res.statusText}`);
        }
        try {
          const json = await res.json();
          setData(json);
        } catch (parseError) {
          console.error('Failed to parse model artifacts JSON:', parseError);
          setData(null);
        }
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

