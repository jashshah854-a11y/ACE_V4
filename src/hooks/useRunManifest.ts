import { useMemo } from "react";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import type { RunManifest } from "@/types/runManifest";

const SUPPORTED_MANIFEST_VERSION = "1.0";

export function isManifestCompatible(manifest: RunManifest | null): boolean {
  return Boolean(manifest && manifest.manifest_version === SUPPORTED_MANIFEST_VERSION);
}

export function useRunManifest(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<RunManifest>(runId, "manifest");
  const compatible = useMemo(() => isManifestCompatible(data ?? null), [data]);
  return { data, loading, error, compatible };
}
