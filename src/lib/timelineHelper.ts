const STORAGE_KEY = 'ace.syntheticTimeline';

type TimelineMap = Record<string, string>;

function safeParse(): TimelineMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TimelineMap) : {};
  } catch (err) {
    console.warn('[TimelineHelper] Failed to parse storage', err);
    return {};
  }
}

function persist(map: TimelineMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('[TimelineHelper] Failed to persist storage', err);
  }
}

export function getSyntheticTimeColumn(runId?: string): string | undefined {
  if (!runId) return undefined;
  const map = safeParse();
  return map[runId];
}

export function setSyntheticTimeColumn(runId: string, column?: string) {
  if (!runId) return;
  const map = safeParse();
  if (!column) {
    delete map[runId];
  } else {
    map[runId] = column;
  }
  persist(map);
}
