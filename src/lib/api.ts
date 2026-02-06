import type {
  UploadResponse,
  AnalyzeResponse,
  RunStatus,
  Snapshot,
  RunsListResponse,
  TaskIntent,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function startAnalysis(
  runId: string,
  taskIntent?: TaskIntent,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: runId,
      fast_mode: false,
      task_intent: taskIntent ?? {
        primary_question:
          "What key insights and patterns can we discover in this dataset that would inform business decisions?",
        decisions_to_drive:
          "Strategic planning and operational improvements",
        audience: "Business executives and analysts",
        time_horizon: "Quarterly review",
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to start analysis");
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
