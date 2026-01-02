// Configurable API base URL with safe default
export const API_BASE = import.meta.env.VITE_ACE_API_BASE_URL || "http://localhost:8000";

export type StepStatus = "pending" | "running" | "completed" | "failed";
export type RunStatus = "pending" | "running" | "completed" | "complete" | "failed" | "complete_with_errors";

export interface PipelineStep {
  name: string;
  status: StepStatus;
  started_at?: string;
  completed_at?: string;
  error?: string;
  progress?: number;
}

export interface RunState {
  run_id: string;
  status: RunStatus;
  current_step?: string;
  next_step?: string;
  progress?: number;
  steps?: Record<string, PipelineStep>;
  steps_completed?: string[];
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface RunResponse {
  run_id: string;
  run_path: string;
  message: string;
  status: string;
}

export interface TaskIntentPayload {
  primaryQuestion: string;
  decisionContext: string;
  requiredOutputType: "diagnostic" | "descriptive" | "predictive";
  successCriteria: string;
  constraints: string;
  confidenceThreshold: number;
  confidenceAcknowledged: boolean;
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


export interface DatasetIdentity {
  row_count: number;
  column_count: number;
  file_type: string;
  schema_map: Array<{ name: string; type: string; sample: string }>;
  quality_score: number;
  critical_gaps: string[];
  detected_capabilities: {
    has_financial_columns: boolean;
    has_time_series: boolean;
    has_categorical: boolean;
    has_numeric: boolean;
  };
  warnings: string[];
}

export async function previewDataset(file: File): Promise<DatasetIdentity> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/runs/preview`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Failed to analyze dataset: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function submitRun(file: File, taskIntent: TaskIntentPayload): Promise<RunResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "task_intent",
    JSON.stringify({
      primary_question: taskIntent.primaryQuestion,
      decision_context: taskIntent.decisionContext,
      required_output_type: taskIntent.requiredOutputType,
      success_criteria: taskIntent.successCriteria,
      constraints: taskIntent.constraints,
      confidence_threshold: taskIntent.confidenceThreshold,
    })
  );
  formData.append("confidence_acknowledged", taskIntent.confidenceAcknowledged ? "true" : "false");

  const response = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `Failed to submit run: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
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
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
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
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
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
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function askQuestion(
  query: string,
  context: string,
  evidenceType: string,
  runId: string
): Promise<{
  answer: string;
  reasoning_steps: string[];
  evidence_context: string;
  grounded: boolean;
}> {
  const response = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      context,
      evidence_type: evidenceType,
      run_id: runId
    })
  });

  if (!response.ok) {
    let errorMessage = `Failed to process question: ${response.statusText}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (parseError) {
      console.error("Failed to parse error response:", parseError);
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
