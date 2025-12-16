const API_BASE = "https://ace-v4-production.up.railway.app";

export interface RunState {
  run_id: string;
  status: "pending" | "running" | "completed" | "complete" | "failed" | "complete_with_errors";
  current_step?: string;
  next_step?: string;
  progress?: number;
  steps?: Record<string, any>;
  error?: string;
}

export async function submitRun(file: File): Promise<{ run_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to submit run: ${response.statusText}`);
  }

  return response.json();
}

export async function getRunState(runId: string): Promise<RunState> {
  const response = await fetch(`${API_BASE}/runs/${runId}/state`);

  if (!response.ok) {
    throw new Error(`Failed to get run state: ${response.statusText}`);
  }

  return response.json();
}

export async function getReport(runId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/runs/${runId}/report`);

  if (!response.ok) {
    throw new Error(`Failed to get report: ${response.statusText}`);
  }

  return response.text();
}
