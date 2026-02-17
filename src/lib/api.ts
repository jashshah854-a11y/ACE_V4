import type {
  DatasetPreview,
  RunResponse,
  RunStatus,
  Snapshot,
  RunsListResponse,
  TaskIntent,
  InsightLensRequest,
  InsightLensResponse,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function previewDataset(file: File): Promise<DatasetPreview> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/run/preview`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Preview failed");
  }
  return res.json();
}

export async function submitRun(
  file: File,
  taskIntent: TaskIntent,
  mode = "full",
): Promise<RunResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("task_intent", JSON.stringify(taskIntent));
  formData.append("confidence_acknowledged", "true");
  formData.append("mode", mode);

  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Run submission failed");
  }
  return res.json();
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
  const res = await fetch(`${API_BASE}/run/${runId}/status`);
  if (!res.ok) {
    throw new Error(`Status fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function getSnapshot(runId: string): Promise<Snapshot> {
  const res = await fetch(`${API_BASE}/run/${runId}/snapshot`);
  if (!res.ok) {
    throw new Error(`Snapshot fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function askInsightLens(
  runId: string,
  question: string,
  context: { activeTab: string },
): Promise<InsightLensResponse> {
  const body: InsightLensRequest = {
    question,
    active_tab: context.activeTab,
  };
  const res = await fetch(`${API_BASE}/run/${runId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Insight Lens request failed");
  }
  return res.json();
}

export async function getAllRuns(
  limit = 20,
  offset = 0,
): Promise<RunsListResponse> {
  const res = await fetch(`${API_BASE}/run?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new Error(`Runs fetch failed: ${res.status}`);
  }
  return res.json();
}
