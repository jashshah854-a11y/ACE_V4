// IRON DOME: Environment Detection Protocol
// Prevents "Build Trap" where production builds query localhost
const isTestEnv = import.meta.env.MODE === "test";
const isDevEnv = import.meta.env.DEV && !isTestEnv;

export const API_BASE =
  import.meta.env.VITE_ACE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://ace-v4-production.up.railway.app")
    : "http://localhost:8000");

// Defense in Depth: If running in a container, localhost is almost always wrong
if (!isTestEnv && typeof window !== "undefined" && window.location.protocol === "https:" && API_BASE.includes("http://localhost")) {
  console.error("[IRON DOME] ⚠️ SECURITY ALERT: HTTPS origin detected but API targeted localhost. Blocking likely failure.");
}

// Debug Log to confirm connection target in Console
if (!isTestEnv) {
console.log("[IRON DOME] 🚀 Active Backend Target:", API_BASE);
console.log("[IRON DOME] 📊 Mode:", import.meta.env.MODE);
}

// LAW 3: DEFENSIVE PARSING - Content-Type Validation
// Prevents "Unexpected token" errors by checking response type before parsing
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type");

  if (!contentType) {
    throw new Error("Response missing Content-Type header");
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (contentType.includes("text/")) {
    const text = await response.text();
    throw new Error(`Expected JSON, received ${contentType}. Body: ${text.substring(0, 100)}...`);
  }

  throw new Error(`Unsupported Content-Type: ${contentType}`);
}

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
  detected_capabilities: Record<string, boolean>;
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

export interface RunSnapshot {
  run_id: string;
  generated_at: string;
  lite: boolean;
  report_markdown?: string;
  governed_report?: any;
  evidence_map?: Record<string, any>;
  manifest: any;
  diagnostics: any;
  identity: any;
  curated_kpis?: {
    rows?: number | string;
    columns?: number | string;
    data_quality_score?: number;
    completeness?: number;
  };
  enhanced_analytics?: any;
  model_artifacts?: any;
  render_policy?: any;
  view_policies?: any;
  trust?: any;
  run_warnings?: any[];
}

// API Client Functions
export async function uploadDataset(file: File): Promise<DatasetIdentity> {
  console.log("[UPLOAD] Starting upload...");
  console.log("[UPLOAD] File:", file.name, file.size, "bytes");
  console.log("[UPLOAD] Target URL:", `${API_BASE}/runs/preview`);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE}/run/preview`, {
      method: "POST",
      body: formData,
    });

    console.log("[UPLOAD] Response status:", response.status);
    console.log("[UPLOAD] Response ok:", response.ok);

    if (!response.ok) {
      const error = await response.text();
      console.error("[UPLOAD] Error response:", error);
      throw new Error(`Upload failed (${response.status}): ${error}`);
    }

    const data = await safeJsonParse(response);
    console.log("[UPLOAD] Success! Data:", data);
    return data;
  } catch (error) {
    console.error("[UPLOAD] Fetch error:", error);

    // Layer 2: Intelligent Error Handling - Detect browser blocking
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (!navigator.onLine) {
        throw new Error("No internet connection detected. Please check your network.");
      }
      console.warn("[ACE Sentry] Request blocked by client. Suspecting ad blocker.");
      throw new Error(
        "BROWSER_BLOCK_DETECTED: Your browser or an extension is blocking this request. " +
        "Please try disabling ad blockers, or use Chrome/Incognito mode."
      );
    }

    throw error;
  }
}

// Alias for backward compatibility
export const previewDataset = uploadDataset;

export async function startAnalysis(file: File, taskIntent?: any): Promise<{ run_id: string }> {
  console.log("[RUN] Starting analysis...");
  console.log("[RUN] Task intent:", taskIntent);

  const formData = new FormData();
  formData.append("file", file);

  // Add required fields
  formData.append("confidence_acknowledged", "true");

  // Add task intent (required field)
  // Backend task_contract.py requires primary_question with 25+ chars and 8+ words
  if (taskIntent) {
    formData.append("task_intent", JSON.stringify(taskIntent));
  } else {
    formData.append("task_intent", JSON.stringify({
      primary_question: "What are the key patterns and anomalies in this dataset that should inform next steps?",
      required_output_type: "diagnostic",
      confidence_threshold: 0.8
    }));
  }

  try {
    const response = await fetch(`${API_BASE}/run`, {
      method: "POST",
      body: formData,
    });

    console.log("[RUN] Response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("[RUN] Error response:", error);
      throw new Error(`Analysis failed to start (${response.status}): ${error}`);
    }

    const data = await safeJsonParse(response);
    console.log("[RUN] Success! Run ID:", data.run_id);
    return data;
  } catch (error) {
    console.error("[RUN] Fetch error:", error);

    // Iron Dome: Detect browser blocking
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      if (!navigator.onLine) {
        throw new Error("No internet connection detected. Please check your network.");
      }
      console.warn("[ACE Sentry] Request blocked by client. Suspecting ad blocker.");
      throw new Error(
        "BROWSER_BLOCK_DETECTED: Your browser or an extension is blocking this request. " +
        "Please try disabling ad blockers, or use Chrome/Incognito mode."
      );
    }

    throw error;
  }
}

// Alias for backward compatibility
export const submitRun = startAnalysis;

// Polling utility for run status
export async function pollRunStatus(
  runId: string,
  onUpdate: (status: RunState) => void,
  intervalMs: number = 2000
): Promise<RunState> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // Enforce Singular Resource Protocol: /run/{id}/status
        // Circuit Breaker implemented: Stop polling on 404
        const response = await fetch(`${API_BASE}/run/${runId}/status`);

        if (response.status === 404) {
          console.error(`[Circuit Breaker] Endpoint Mismatch Error: 404 Not Found for /run/${runId}/status`);
          reject(new Error("Run not found (404) - Stopping polling"));
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to get status: ${response.statusText}`);
        }

        const status = await safeJsonParse(response);
        onUpdate(status);

        if (status.status === "completed" || status.status === "complete") {
          resolve(status);
        } else if (status.status === "failed") {
          reject(new Error(status.error || "Analysis failed"));
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (error) {
        // If it's a network error, we might want to retry, but for now we follow the circuit breaker pattern mostly for logic errors
        console.error("Polling error:", error);
        reject(error);
      }
    };

    poll();
  });
}



// Report is returned as a raw Markdown string (FileResponse), NOT JSON.
// Fixes "Unexpected token #" error.
export async function getRunStatus(runId: string): Promise<RunState> {
  // standardized to singular /run/ endpoint to match pollRunStatus
  const response = await fetch(`${API_BASE}/run/${runId}/status`);

  if (!response.ok) {
    throw new Error(`Failed to get run status: ${response.statusText}`);
  }

  return safeJsonParse(response);
}

export async function getReport(runId: string): Promise<string> {
  const cleanId = runId.trim();

  const response = await fetch(`${API_BASE}/run/${cleanId}/report`, {
    method: "GET",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Report not generated yet");
    }
    throw new Error(`Failed to fetch report: ${response.statusText}`);
  }

  // Handle Markdown content safely (Do NOT parse as JSON)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Unknown error");
  }

  return response.text();
}

function snapshotCacheKey(runId: string, lite: boolean) {
  return `ace.snapshot.${lite ? "lite" : "full"}.${runId}`;
}

function snapshotEtagKey(runId: string, lite: boolean) {
  return `ace.snapshot.etag.${lite ? "lite" : "full"}.${runId}`;
}

export async function getRunSnapshot(runId: string, lite: boolean = false): Promise<RunSnapshot> {
  const cleanId = runId.trim();
  const cacheKey = snapshotCacheKey(cleanId, lite);
  const etagKey = snapshotEtagKey(cleanId, lite);
  const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
  const cachedEtag = typeof window !== "undefined" ? localStorage.getItem(etagKey) : null;

  const response = await fetch(`${API_BASE}/run/${cleanId}/snapshot?lite=${lite ? "true" : "false"}`, {
    method: "GET",
    headers: cachedEtag ? { "If-None-Match": cachedEtag } : undefined,
  });

  if (response.status === 304 && cached) {
    if (isDevEnv) {
      console.debug(`[SNAPSHOT] cache-hit ${cleanId} (${lite ? "lite" : "full"})`);
    }
    return JSON.parse(cached) as RunSnapshot;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
  }

  const payload = (await response.json()) as RunSnapshot;
  const etag = response.headers.get("etag");
  if (isDevEnv) {
    console.debug(`[SNAPSHOT] fetched ${cleanId} (${lite ? "lite" : "full"})`);
  }
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(payload));
      if (etag) {
        localStorage.setItem(etagKey, etag);
      }
    } catch {
      // Ignore cache failures
    }
  }

  return payload;
}


export async function getEnhancedAnalytics(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/run/${runId}/enhanced-analytics`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to get enhanced analytics: ${response.statusText}`);
  }

  return response.json();
}

export interface PaginatedRuns {
  runs: string[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export async function getAllRuns(limit: number = 20, offset: number = 0): Promise<PaginatedRuns> {
  const response = await fetch(`${API_BASE}/run?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error(`Failed to get runs: ${response.statusText}`);
  }

  return safeJsonParse(response);
}

export async function getModelArtifacts(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/run/${runId}/model-artifacts`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Failed to get model artifacts: ${response.statusText}`);
  }

  return response.json();
}
