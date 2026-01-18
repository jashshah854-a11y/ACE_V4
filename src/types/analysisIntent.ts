export type AnalysisIntent = "exploratory" | "predictive" | "causal" | "automation";

export interface TargetCandidate {
  column: string | null;
  reason: string;
  confidence: number;
  detected: boolean;
}

export interface ScopeConstraint {
  agent?: string;
  reason_code?: string;
  message?: string;
}

export interface ScopeConstraintDisplay {
  agent?: string;
  reasonCode?: string;
  title: string;
  detail: string;
}
