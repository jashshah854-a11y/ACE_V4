import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-client";

interface EvidenceRecord {
  evidence_id: string;
  columns_used: string[];
  computation_method: string;
  result_statistic: Record<string, any>;
  confidence_level: number;
  scope?: string;
  limitations?: string[];
  timestamp?: string;
}

interface EvidenceResponse {
  records?: Record<string, EvidenceRecord>;
}

export function useEvidenceRegistry(runId?: string) {
  const [data, setData] = useState<Record<string, EvidenceRecord> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }

    const fetchEvidence = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/runs/${runId}/evidence`);
        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            return;
          }
          throw new Error(`Failed to load evidence registry: ${response.statusText}`);
        }
        const json: EvidenceResponse = await response.json();
        setData(json.records || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEvidence();
  }, [runId]);

  return { data, loading, error };
}
