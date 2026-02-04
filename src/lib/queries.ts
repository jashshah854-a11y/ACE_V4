import { useQuery } from "@tanstack/react-query";
import {
  getRunStatus,
  getRunSnapshot,
  getEnhancedAnalytics,
  getModelArtifacts,
  getReport,
  getAllRuns,
  getRunPerformance,
  getRecommendations,
  type RunState,
  type RunSnapshot,
  type PaginatedRuns,
  type PerformanceData,
  type RecommendationsData,
} from "@/lib/api-client";

/**
 * Poll run status every 2s while the run is active.
 * Stops polling once the run reaches a terminal state.
 */
export function useRunStatus(runId: string | undefined) {
  return useQuery<RunState>({
    queryKey: ["run-status", runId],
    queryFn: () => getRunStatus(runId!),
    enabled: Boolean(runId),
    staleTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "completed" ||
        status === "complete" ||
        status === "failed" ||
        status === "complete_with_errors"
      ) {
        return false;
      }
      return 2000;
    },
  });
}

/**
 * Fetch the run snapshot (full or lite).
 * Polls every 10s while the run is still incomplete.
 */
export function useRunSnapshot(runId: string | undefined, lite: boolean = false) {
  return useQuery<RunSnapshot>({
    queryKey: ["run-snapshot", runId, lite],
    queryFn: () => getRunSnapshot(runId!, lite),
    enabled: Boolean(runId),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const snap = query.state.data;
      // Keep polling if we don't have a report yet (still generating)
      if (!snap?.report_markdown && !snap?.governed_report) {
        return 10_000;
      }
      return false;
    },
  });
}

/**
 * Fetch enhanced analytics for a completed run.
 */
export function useEnhancedAnalytics(runId: string | undefined) {
  return useQuery({
    queryKey: ["enhanced-analytics", runId],
    queryFn: () => getEnhancedAnalytics(runId!),
    enabled: Boolean(runId),
    staleTime: 60_000,
  });
}

/**
 * Fetch model artifacts for a completed run.
 */
export function useModelArtifacts(runId: string | undefined) {
  return useQuery({
    queryKey: ["model-artifacts", runId],
    queryFn: () => getModelArtifacts(runId!),
    enabled: Boolean(runId),
    staleTime: 60_000,
  });
}

/**
 * Fetch the full markdown report.
 */
export function useReport(runId: string | undefined) {
  return useQuery<string>({
    queryKey: ["report", runId],
    queryFn: () => getReport(runId!),
    enabled: Boolean(runId),
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch paginated run list.
 */
export function useRunsList(limit: number = 20, offset: number = 0) {
  return useQuery<PaginatedRuns>({
    queryKey: ["runs-list", limit, offset],
    queryFn: () => getAllRuns(limit, offset),
    staleTime: 15_000,
  });
}

/**
 * Fetch performance profiling data for a run.
 */
export function useRunPerformance(runId: string | undefined) {
  return useQuery<PerformanceData | null>({
    queryKey: ["run-performance", runId],
    queryFn: () => getRunPerformance(runId!),
    enabled: Boolean(runId),
    staleTime: 30_000,
  });
}

/**
 * Fetch ML-driven recommendations for a run.
 */
export function useRecommendations(runId: string | undefined) {
  return useQuery<RecommendationsData | null>({
    queryKey: ["recommendations", runId],
    queryFn: () => getRecommendations(runId!),
    enabled: Boolean(runId),
    staleTime: 60_000,
  });
}
