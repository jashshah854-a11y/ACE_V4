import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export function useRunStatus(runId: string | undefined) {
  return useQuery({
    queryKey: ["runStatus", runId],
    queryFn: () => api.getRunStatus(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "complete" || status === "failed") return false;
      return 2000;
    },
  });
}

export function useSnapshot(runId: string | undefined) {
  return useQuery({
    queryKey: ["snapshot", runId],
    queryFn: () => api.getSnapshot(runId!),
    enabled: !!runId,
    staleTime: 60000,
  });
}

export function useRunsList(limit = 20, offset = 0) {
  return useQuery({
    queryKey: ["runs", limit, offset],
    queryFn: () => api.getAllRuns(limit, offset),
  });
}
