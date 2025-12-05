// ACE-V2 API Client
// Connects to the ACE-V2 FastAPI backend

const API_BASE_URL = 'https://web-production-4501f.up.railway.app';

export interface RunResponse {
  run_id: string;
  run_path: string;
  message: string;
}

export interface AceArtifact {
  [key: string]: any;
}

/**
 * Upload a file and trigger an ACE V3 run
 */
export async function triggerRun(file: File): Promise<RunResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/run`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to trigger ACE run');
  }

  return response.json();
}

/**
 * Get the final report for a specific run
 */
export async function getReport(runId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}/report`);

  if (!response.ok) {
    throw new Error('Failed to fetch report');
  }

  return response.text();
}

/**
 * Get a specific artifact (overseer_output, personas, strategies, etc.)
 */
export async function getArtifact(runId: string, artifactName: string): Promise<AceArtifact> {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}/artifacts/${artifactName}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch artifact: ${artifactName}`);
  }

  return response.json();
}

/**
 * List all available runs
 */
export async function listRuns(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/runs`);

  if (!response.ok) {
    throw new Error('Failed to list runs');
  }

  return response.json();
}
