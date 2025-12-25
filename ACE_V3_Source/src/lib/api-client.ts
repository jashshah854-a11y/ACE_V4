const API_BASE = import.meta.env.VITE_ACE_API_BASE_URL || "http://localhost:8001";

export type StepStatus = "pending" | "running" | "completed" | "failed";
export type RunStatus = "pending" | "running" | "completed" | "complete" | "failed" | "complete_with_errors";

export interface PipelineStep {
  name: string;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
  source?: SourceMetadata;
  error?: string;
  progress?: number;
}

export interface SourceMetadata {
  connector?: string;
  [key: string]: any;
}

export interface RunState {
  run_id: string;
  status: RunStatus;
  created_at?: string;
  updated_at?: string;
  current_step?: string;
  next_step?: string;
  progress?: number;
  steps?: Record<string, PipelineStep>;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface RunDetails {
  run_id: string;
  status?: RunStatus | string;
  created_at?: string;
  source?: SourceMetadata;
}

export interface RunsResponse {
  runs: string[];
  run_details?: RunDetails[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface RunResponse {
  run_id: string;
  run_path: string;
  message: string;
  status: string;
}

export interface ApiError {
  detail: string;
}

export interface InsightsResponse {
  warnings: string[];
  strengths: string[];
  recommendations: string[];
  metadata: {
    quality_score: number;
    anomaly_count: number;
    model_r2: number | null;
    cluster_count: number;
  };
}

export async function submitRun(file: File): Promise<RunResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Failed to submit run: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getRunState(runId: string): Promise<RunState> {
  const response = await fetch(`${API_BASE}/runs/${runId}/state`);

  if (!response.ok) {
    let errorMessage = `Failed to get run state: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = `${errorData.detail || errorMessage} (${response.status})`;
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function getReport(runId: string): Promise<string> {
  const response = await fetch(`${API_BASE}/runs/${runId}/report`);

  if (!response.ok) {
    let errorMessage = `Failed to get report (${response.status})`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = `${errorData.detail || errorMessage} (${response.status})`;
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.text();
}

export async function getInsights(runId: string): Promise<InsightsResponse> {
  const response = await fetch(`${API_BASE}/runs/${runId}/insights`);

  if (!response.ok) {
    let errorMessage = `Failed to get insights: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = `${errorData.detail || errorMessage} (${response.status})`;
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function listRuns(limit: number = 25): Promise<RunsResponse> {
  const response = await fetch(`${API_BASE}/runs?limit=${limit}`);

  if (!response.ok) {
    let errorMessage = `Failed to list runs: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = `${errorData.detail || errorMessage} (${response.status})`;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
