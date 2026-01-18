import type { TrustBand } from "@/types/trust";
import { TRUST_RULESET_VERSION } from "@/lib/trustScoring";

export interface RunTrustSummary {
  score: number;
  band: TrustBand;
  certified: boolean;
  updatedAt: string;
  rulesetVersion: string;
}

interface TrustCachePayload {
  runs: Record<string, RunTrustSummary>;
}

const STORAGE_KEY = "ace_trust_cache";

function buildKey(runId: string, rulesetVersion: string) {
  return `${runId}::${rulesetVersion}`;
}

function loadCache(): TrustCachePayload {
  if (typeof window === "undefined") return { runs: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { runs: {} };
    const parsed = JSON.parse(raw) as TrustCachePayload;
    if (!parsed || typeof parsed !== "object") return { runs: {} };
    return { runs: parsed.runs || {} };
  } catch {
    return { runs: {} };
  }
}

function saveCache(payload: TrustCachePayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function updateRunTrust(runId: string, summary: RunTrustSummary) {
  if (!runId) return;
  const cache = loadCache();
  cache.runs[buildKey(runId, summary.rulesetVersion)] = summary;
  saveCache(cache);
}

export function getRunTrust(runId: string): RunTrustSummary | undefined {
  if (!runId) return undefined;
  const cache = loadCache();
  return cache.runs[buildKey(runId, TRUST_RULESET_VERSION)];
}
