
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  triggerRun,
  listRunSummaries,
  getRunState,
  getRunArtifacts,
  isTerminalStatus,
  RunStatus,
} from "@/lib/api-client";

export function useTriggerRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerRun,
    onSuccess: (data) => {
      toast.success("Run started successfully", {
        description: `Run ID: ${data.run_id}`,
      });
      // Invalidate runs list to show the new run
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to start run", {
        description: error.message,
      });
    },
  });
}

export function useListRunSummaries(limit = 25) {
  return useQuery({
    queryKey: ["runs", limit],
    queryFn: () => listRunSummaries(limit),
    refetchInterval: 15000, // Poll every 15s
  });
}

export function useRunState(runId: string | null) {
  return useQuery({
    queryKey: ["run-state", runId],
    queryFn: () => getRunState(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      // Poll every 4s if run is active, otherwise stop polling
      const status = query.state?.status as RunStatus | undefined;
      return isTerminalStatus(status) ? false : 4000;
    },
  });
}

export function useRunArtifacts(runId: string | null, status?: RunStatus) {
  const isComplete = isTerminalStatus(status);

  return useQuery({
    queryKey: ["run-artifacts", runId],
    queryFn: () => getRunArtifacts(runId!),
    enabled: !!runId && isComplete,
    staleTime: Infinity, // Artifacts are immutable once run is complete
  });
}
