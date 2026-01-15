import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";

export interface TaskContractSnapshot {
  primary_question?: string;
  decision_context?: string;
  required_output_type?: "diagnostic" | "descriptive" | "predictive" | string;
  success_criteria?: string;
  constraints?: string;
  confidence_threshold?: number;
  scope_inclusions?: string[];
  scope_exclusions?: string[];
  out_of_scope_dimensions?: string[];
}

export interface GovernedReport {
  mode?: string;
  allowed_sections?: string[];
  data_type?: string;
  confidence?: {
    data_confidence?: number;
    confidence_label?: string;
    reasons?: string[];
  };
  limitations?: Array<{ agent?: string; message?: string; severity?: string }>;
  insights?: any[];
  evidence?: Record<string, any>;
  task_contract?: TaskContractSnapshot;
}

export function describeTaskContract(contract?: TaskContractSnapshot) {
  if (!contract) return undefined;
  const parts: string[] = [];
  if (contract.primary_question) parts.push(`Primary Question: ${contract.primary_question}`);
  if (contract.decision_context) parts.push(`Context: ${contract.decision_context}`);
  if (contract.required_output_type) parts.push(`Output Type: ${contract.required_output_type}`);
  if (contract.success_criteria) parts.push(`Success Criteria: ${contract.success_criteria}`);
  if (contract.constraints) parts.push(`Constraints: ${contract.constraints}`);
  const scope = contract.out_of_scope_dimensions?.length
    ? contract.out_of_scope_dimensions
    : contract.scope_exclusions;
  if (scope && scope.length) {
    parts.push(`Out-of-scope: ${scope.join(", ")}`);
  }
  return parts.join("\n");
}

export function useGovernedReport(runId?: string) {
  const { data, loading, error } = useRemoteArtifact<GovernedReport>(runId, "artifacts/governed_report");
  return { data, loading, error };
}
