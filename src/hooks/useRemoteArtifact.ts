import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-client";

interface RemoteArtifactState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

export function useRemoteArtifact<T>(runId: string | undefined, endpoint: string): RemoteArtifactState<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!runId) {
            setData(null);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchArtifact = async () => {
            setLoading(true);
            setError(null);
            try {
                // Handle fully qualified URLs or relative paths
                const url = endpoint.startsWith("http")
                    ? endpoint
                    : `${API_BASE}/run/${runId}/${endpoint}`;

                const res = await fetch(url);

                if (!res.ok) {
                    if (res.status === 404) {
                        // 404 is a valid state for missing artifacts (not an error)
                        if (!cancelled) setData(null);
                        return;
                    }
                    throw new Error(`Failed to fetch ${endpoint}: ${res.statusText}`);
                }

                try {
                    const json = await res.json();
                    if (!cancelled) setData(json);
                } catch (parseError) {
                    console.error(`[useRemoteArtifact] Failed to parse JSON for ${endpoint}:`, parseError);
                    // Don't set error state for parse errors, just fallback to null data
                    // This prevents UI crashes for minor backend glitches
                    if (!cancelled) setData(null);
                }

            } catch (err) {
                if (!cancelled) {
                    // Log specific error but present generic safe message to UI if needed
                    const msg = err instanceof Error ? err.message : "Unknown error";
                    console.warn(`[useRemoteArtifact] Error fetching ${endpoint}:`, msg);
                    setError(msg);
                    setData(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchArtifact();

        return () => {
            cancelled = true;
        };
    }, [runId, endpoint]);

    return { data, loading, error };
}
