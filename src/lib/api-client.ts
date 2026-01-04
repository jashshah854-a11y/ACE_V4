// SMART ENVIRONMENT SWITCH
// If we are on localhost, use local backend. 
// If we are on the web (Vercel), use Production Railway Backend.
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return "http://localhost:8000";
    }
  }
  // Fallback to Production for ANY non-local environment
  return "https://ace-v4-production.up.railway.app";
};

export const API_BASE = getBaseUrl();

// Debug Log to confirm connection target in Console
console.log("[ACE NETWORK] 🚀 Connecting to Backend at:", API_BASE);

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
  steps: PipelineStep[];
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetIdentity {
  row_count: number;
  column_count: number;
  file_type: string;
  schema_map: Array<{
    name: string;
    type: string;
    sample: string;
  }>;
  quality_score: number;
  critical_gaps: string[];
  detected_capabilities: string[];
  warnings: string[];
}

export interface ReportData {
  run_id: string;
  status: string;
  dataset_identity: DatasetIdentity;
  business_intelligence?: {
    churn_risk?: {
      at_risk_count: number;
      at_risk_percentage: number;
      avg_activity: number;
      low_activity_threshold: number;
    };
  };
  feature_importance?: Array<{
    feature: string;
    importance: number;
    direction: string;
  }>;
  behavioral_clusters?: {
    n_clusters: number;
    silhouette_score: number;
    clusters: Array<{
      cluster_id: number;
      size: number;
      avg_activity: number;
      churn_rate: number;
    }>;
  };
}

// API Client Functions
export async function uploadDataset(file: File): Promise<DatasetIdentity> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/runs/preview`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }

  return response.json();
}

export async function startAnalysis(file: File): Promise<{ run_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/run`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Analysis failed to start: ${error}`);
  }

  return response.json();
}

export async function getRunStatus(runId: string): Promise<RunState> {
  const response = await fetch(`${API_BASE}/runs/${runId}/status`);

  if (!response.ok) {
    throw new Error(`Failed to get run status: ${response.statusText}`);
  }

  return response.json();
}

export async function getReport(runId: string): Promise<ReportData> {
  const response = await fetch(`${API_BASE}/runs/${runId}/report`);

  if (!response.ok) {
    throw new Error(`Failed to get report: ${response.statusText}`);
  }

  return response.json();
}

export async function getEnhancedAnalytics(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/runs/${runId}/enhanced-analytics`);

  if (!response.ok) {
    throw new Error(`Failed to get enhanced analytics: ${response.statusText}`);
  }

  return response.json();
}

export async function getAllRuns(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/runs`);

  if (!response.ok) {
    throw new Error(`Failed to get runs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.run_ids || [];
}

export async function askQuestion(
  runId: string,
  query: string,
  evidenceType: string = "business_pulse",
  context: string = "executive_summary"
): Promise<any> {
  const response = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      run_id: runId,
      query,
      evidence_type: evidenceType,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ask query failed: ${response.statusText}`);
  }

  return response.json();
}

// Polling utility for run status
export async function pollRunStatus(
  runId: string,
  onUpdate: (status: RunState) => void,
  intervalMs: number = 2000
): Promise<RunState> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getRunStatus(runId);
        onUpdate(status);

        if (status.status === "completed" || status.status === "complete") {
          resolve(status);
        } else if (status.status === "failed") {
          reject(new Error(status.error || "Analysis failed"));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}
