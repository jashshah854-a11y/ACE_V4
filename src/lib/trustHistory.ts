import type { TrustScore } from "@/types/trust";

interface TrustHistoryEntry {
  score: number;
  timestamp: string;
}

interface TrustHistoryPayload {
  insights: Record<string, TrustHistoryEntry[]>;
}

const STORAGE_KEY = "ace_trust_history";

function loadHistory(): TrustHistoryPayload {
  if (typeof window === "undefined") return { insights: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { insights: {} };
    const parsed = JSON.parse(raw) as TrustHistoryPayload;
    return { insights: parsed.insights || {} };
  } catch {
    return { insights: {} };
  }
}

function saveHistory(payload: TrustHistoryPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function recordTrustHistory(insightId: string, trust: TrustScore) {
  if (!insightId) return;
  const history = loadHistory();
  const entries = history.insights[insightId] || [];
  const latest = entries[entries.length - 1];
  if (latest && Math.abs(latest.score - trust.score) < 0.001) {
    return;
  }
  const next = [...entries, { score: trust.score, timestamp: new Date().toISOString() }].slice(-10);
  history.insights[insightId] = next;
  saveHistory(history);
}

export function getTrustTrend(insightId: string) {
  const history = loadHistory();
  const entries = history.insights[insightId] || [];
  if (entries.length < 2) return { trend: "flat" as const, delta: 0 };
  const last = entries[entries.length - 1].score;
  const prev = entries[entries.length - 2].score;
  const delta = last - prev;
  if (delta > 0.05) return { trend: "up" as const, delta };
  if (delta < -0.05) return { trend: "down" as const, delta };
  return { trend: "flat" as const, delta };
}
