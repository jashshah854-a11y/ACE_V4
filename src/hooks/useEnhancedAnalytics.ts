import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";

export function useEnhancedAnalytics(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<EnhancedAnalyticsData>(runId, "enhanced-analytics");
  return { data: data ?? null, loading, error };
}
