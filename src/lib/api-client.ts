// IRON DOME: Environment Detection Protocol
// Prevents "Build Trap" where production builds query localhost
export const API_BASE =
  import.meta.env.VITE_ACE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? (window.location.hostname === "localhost" ? "http://localhost:8000" : "https://ace-v4-production.up.railway.app")
    : "http://localhost:8000");

// Defense in Depth: If running in a container, localhost is almost always wrong
if (typeof window !== "undefined" && window.location.protocol === "https:" && API_BASE.includes("http://localhost")) {
  console.error("[IRON DOME] ⚠️ SECURITY ALERT: HTTPS origin detected but API targeted localhost. Blocking likely failure.");
}

// Debug Log to confirm connection target in Console
console.log("[IRON DOME] 🚀 Active Backend Target:", API_BASE);
console.log("[IRON DOME] 📊 Mode:", import.meta.env.MODE);

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
  if (taskIntent) {
    formData.append("task_intent", JSON.stringify(taskIntent));
  } else {
    // Default task intent if not provided
    formData.append("task_intent", JSON.stringify({
      primary_question: "Analyze this dataset",
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

// Forced Deployment Trigger: 2026-01-09T11:13:00
import { supabase } from "@/lib/supabase";

// Forced Deployment Trigger: 2026-01-09T11:13:00
export async function getReport(runId: string): Promise<string> {
  const cleanId = runId.trim();

  // STRATEGY: Read-Through Cache via Supabase
  // 1. Try fetching from Supabase first (Persistent Layer)
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('content')
      .eq('run_id', cleanId)
      .single();

    if (data?.content && !error) {
      console.log(`[SUPABASE] Cache Hit for ${cleanId}`);
      // If stored as JSON wrapper, extract markdown, else return as string
      return typeof data.content === 'object' && data.content.markdown
        ? data.content.markdown
        : data.content;
    }
  } catch (err) {
    console.warn("[SUPABASE] Cache lookup failed:", err);
  }

  // 2. Fallback to API (Generation Layer)
  // CRITICAL FIX 1: Use Singular Protocol (/run/) not Plural (/runs/)
  const response = await fetch(`${API_BASE}/run/${cleanId}/report`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      console.error(`[API] Report not found for run ${cleanId}. The agent may have failed to save 'final_report.md'.`);
      throw new Error("Report not generated yet");
    }
    throw new Error(`Failed to fetch report: ${response.statusText}`);
  }

  // CRITICAL FIX 2: Handle Markdown content safely (Do NOT parse as JSON)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    // If backend incorrectly sends JSON error, handle it
    const errorData = await response.json();
    throw new Error(errorData.detail || "Unknown error");
  }

  // Return raw markdown text
  const markdown = await response.text();

  // 3. Save to Supabase for future access
  saveReportToSupabase(cleanId, markdown).catch(err =>
    console.error("[SUPABASE] Failed to persist report:", err)
  );

  return markdown;
}

// Internal Helper to persist reports
async function saveReportToSupabase(runId: string, markdown: string) {
  // Construct a title/summary if possible (naive parse for now)
  const titleMatch = markdown.match(/^# (.*$)/m);
  const title = titleMatch ? titleMatch[1] : `Report ${runId}`;

  // Store content. Using JSONB column for flexibility
  const contentPayload = { markdown };

  const { error } = await supabase.from('reports').upsert({
    run_id: runId,
    title: title,
    content: contentPayload,
    // We can add pipeline_state here if we had it, but for getReport we only have the markdown
  }, { onConflict: 'run_id' });

  if (error) throw error;
  console.log(`[SUPABASE] Persisted report ${runId}`);
}

export async function getEnhancedAnalytics(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/run/${runId}/enhanced-analytics`);

  if (!response.ok) {
    throw new Error(`Failed to get enhanced analytics: ${response.statusText}`);
  }

  return response.json();
}

export async function getAllRuns(): Promise<RunHistoryItem[]> {
  const response = await fetch(`${API_BASE}/run`);

  if (!response.ok) {
    throw new Error(`Failed to get runs: ${response.statusText}`);
  }

  return safeJsonParse(response);
}

export interface Modification {
  target_column: string;
  modification_factor: number;
}

export interface SimulationRequest {
  target_column?: string; // Legacy support
  modification_factor?: number; // Legacy support
  modifications?: Modification[];
}

export interface SimulationResult {
  run_id: string;
  delta: any;
  business_impact: any;
}

export async function simulateScenario(runId: string, request: SimulationRequest): Promise<SimulationResult> {
  // Auto-convert legacy single-param to list format if needed
  if (!request.modifications && request.target_column && request.modification_factor) {
    request.modifications = [{
      target_column: request.target_column,
      modification_factor: request.modification_factor
    }];
  }

  if (request.modifications && request.modifications.length > 0) {
    const first = request.modifications[0];
    if (!request.target_column) {
      request.target_column = first.target_column;
    }
    if (!request.modification_factor) {
      request.modification_factor = first.modification_factor;
    }
  }

  const response = await fetch(`${API_BASE}/run/${runId}/simulate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Simulation failed: ${error}`);
  }

  return safeJsonParse(response);
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

  return safeJsonParse(response);
}



// PHASE 10: What-If Simulation
// ...

// SUPABASE HISTORY
import { RecentReport } from "@/lib/localStorage";

export async function getReportsHistory(): Promise<RecentReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('run_id, title, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`[SUPABASE] Failed to fetch reports history:`, error);
    return [];
  }

  return data.map(row => ({
    runId: row.run_id,
    timestamp: row.created_at,
    title: row.title || `Report ${row.run_id}`,
    createdAt: new Date(row.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }));
}
