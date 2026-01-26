import { useQuery } from "@tanstack/react-query";
import { getRunSnapshot, type RunSnapshot } from "@/lib/api-client";

export function useRunSnapshot(runId?: string, lite: boolean = true) {
  const enabled = Boolean(runId);
  const { data, isLoading, error } = useQuery<RunSnapshot>({
    queryKey: ["run-snapshot", runId, lite ? "lite" : "full"],
    queryFn: () => getRunSnapshot(runId as string, lite),
    enabled,
    staleTime: 30000,
    retry: false,
  });

  return { data: data ?? null, loading: isLoading, error };
}
