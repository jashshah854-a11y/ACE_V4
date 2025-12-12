const DEFAULT_API_BASE_URL = "http://localhost:8001";

const rawBaseUrl = (import.meta.env.VITE_ACE_API_BASE_URL ?? "").trim();
const API_BASE_URL = (rawBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, "");
const USING_DEFAULT_BASE_URL = rawBaseUrl.length === 0;

if (USING_DEFAULT_BASE_URL && import.meta.env.DEV) {
  console.warn(`[ACE API] VITE_ACE_API_BASE_URL not set. Falling back to ${DEFAULT_API_BASE_URL}`);
}

export type RunStatus =
  | "pending"
  | "running"
  | "running_with_errors"
  | "accepted"
  | "complete"
  | "complete_with_errors"
  | "failed";

export interface PipelineStepState {
  name?: string;
  description?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  runtime_seconds?: number;
  stdout_tail?: string;
  stderr_tail?: string;
}

export interface RunHistoryEntry {
  timestamp: string;
  event: string;
  [key: string]: unknown;
}

export interface RunState {
  run_id: string;
  status: RunStatus;
  steps: Record<string, PipelineStepState>;
  steps_completed?: string[];
  failed_steps?: string[];
  history?: RunHistoryEntry[];
  current_step?: string;
  next_step?: string;
  created_at?: string;
  updated_at?: string;
  data_path?: string;
}

export interface RunSummary {
  id: string;
  status: RunStatus;
  createdAt?: string;
  updatedAt?: string;
  durationSeconds?: number;
  latestEvent?: string;
  completedSteps?: number;
  failedSteps?: number;
}

export interface RunResponse {
  run_id: string;
  run_path: string;
  message: string;
  status: string;
}

export interface AceArtifact {
  [key: string]: unknown;
}

export interface RunArtifacts {
  schema?: AceArtifact;
  overseer?: AceArtifact;
  personas?: AceArtifact;
  strategies?: AceArtifact;
  anomalies?: AceArtifact;
  finalReport?: string;
}

export class ApiError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

const ARTIFACT_ENDPOINTS = {
  schema: "schema_map",
  overseer: "overseer_output",
  personas: "personas",
  strategies: "strategies",
  anomalies: "anomalies",
} as const;

const MAX_SUMMARY_RUNS = 40;

type ArtifactSlug = (typeof ARTIFACT_ENDPOINTS)[keyof typeof ARTIFACT_ENDPOINTS];
type RequestParser = "json" | "text";

export const RUN_TERMINAL_STATUSES: RunStatus[] = ["complete", "complete_with_errors", "failed"];
export const RUN_COMPLETE_STATUSES = new Set<RunStatus>(RUN_TERMINAL_STATUSES);
export const RUN_ACTIVE_STATUSES = new Set<RunStatus>(["pending", "running", "running_with_errors", "accepted"]);

function resolvePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function resolveUrl(path: string) {
  return `${API_BASE_URL}${resolvePath(path)}`;
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === "fulfilled";
}

function last<T>(items?: T[]): T | undefined {
  if (!items || !items.length) {
    return undefined;
  }
  return items[items.length - 1];
}

async function request<T>(path: string, init: RequestInit = {}, parser: RequestParser = "json"): Promise<T> {
  const response = await fetch(resolveUrl(path), init);
  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.detail ?? parsed.message ?? body;
    } catch {
      // No-op: body wasn't JSON
    }
    throw new ApiError(detail || `Request failed (${response.status})`, response.status, response.url);
  }

  if (parser === "text") {
    return (await response.text()) as T;
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function isTerminalStatus(status?: RunStatus | string | null) {
  if (!status) {
    return false;
  }
  return RUN_COMPLETE_STATUSES.has(status as RunStatus);
}

export function isActiveStatus(status?: RunStatus | string | null) {
  if (!status) {
    return false;
  }
  return RUN_ACTIVE_STATUSES.has(status as RunStatus);
}

export async function triggerRun(file: File): Promise<RunResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return request<RunResponse>("/run", {
    method: "POST",
    body: formData,
  });
}

export async function listRuns(): Promise<string[]> {
  return request<string[]>("/runs");
}

export async function listRunSummaries(limit = 25): Promise<RunSummary[]> {
  const runIds = await listRuns();
  const targetIds = runIds.slice(0, Math.min(limit, MAX_SUMMARY_RUNS));

  const states = await Promise.allSettled(targetIds.map((runId) => getRunState(runId)));

  return states
    .filter(isFulfilled)
    .map((result) => mapStateToSummary(result.value))
    .sort((a, b) => {
      const aTs = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTs = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTs - aTs;
    });
}

export async function getRunState(runId: string): Promise<RunState> {
  if (!runId) {
    throw new Error("runId is required");
  }
  return request<RunState>(`/runs/${runId}/state`);
}

export async function getArtifact(
  runId: string,
  artifactName: ArtifactSlug | string,
  options?: { optional?: boolean },
): Promise<AceArtifact | undefined> {
  try {
    return await request<AceArtifact>(`/runs/${runId}/artifacts/${artifactName}`);
  } catch (error) {
    if (options?.optional && error instanceof ApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function getReport(runId: string, options?: { optional?: boolean }): Promise<string | undefined> {
  try {
    return await request<string>(`/runs/${runId}/report`, { headers: { Accept: "text/plain" } }, "text");
  } catch (error) {
    if (options?.optional && error instanceof ApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

export async function getRunArtifacts(runId: string): Promise<RunArtifacts> {
  const [schema, overseer, personas, strategies, anomalies, finalReport] = await Promise.all([
    getArtifact(runId, ARTIFACT_ENDPOINTS.schema, { optional: true }),
    getArtifact(runId, ARTIFACT_ENDPOINTS.overseer, { optional: true }),
    getArtifact(runId, ARTIFACT_ENDPOINTS.personas, { optional: true }),
    getArtifact(runId, ARTIFACT_ENDPOINTS.strategies, { optional: true }),
    getArtifact(runId, ARTIFACT_ENDPOINTS.anomalies, { optional: true }),
    getReport(runId, { optional: true }),
  ]);

  return { schema, overseer, personas, strategies, anomalies, finalReport };
}

function mapStateToSummary(state: RunState): RunSummary {
  const created = state.created_at ? Date.parse(state.created_at) : undefined;
  const updated = state.updated_at ? Date.parse(state.updated_at) : undefined;

  return {
    id: state.run_id,
    status: state.status,
    createdAt: state.created_at,
    updatedAt: state.updated_at,
    durationSeconds: created && updated ? Math.max(0, Math.round((updated - created) / 1000)) : undefined,
    latestEvent: last(state.history)?.event,
    completedSteps: state.steps_completed?.length,
    failedSteps: state.failed_steps?.length,
  };
}
