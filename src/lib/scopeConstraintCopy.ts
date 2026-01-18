import type { AnalysisIntent, ScopeConstraint, ScopeConstraintDisplay, TargetCandidate } from "@/types/analysisIntent";

const AGENT_LABELS: Record<string, string> = {
  regression: "Outcome modeling",
  fabricator: "Strategy recommendations",
  overseer: "Behavioral clustering",
  sentry: "Anomaly detection",
  personas: "Persona synthesis",
};

function resolveAgentLabel(agent?: string) {
  if (!agent) return "This analysis";
  return AGENT_LABELS[agent] || agent;
}

export function formatScopeConstraint(
  constraint: ScopeConstraint,
  intent?: AnalysisIntent,
  targetCandidate?: TargetCandidate
): ScopeConstraintDisplay {
  const agent = constraint.agent;
  const reasonCode = constraint.reason_code;
  const agentLabel = resolveAgentLabel(agent);
  const targetMissing = targetCandidate && !targetCandidate.detected;
  const targetDetail = targetMissing
    ? "No usable target column was detected."
    : "A target column is required for outcome modeling.";

  if (reasonCode === "intent_exploratory") {
    return {
      agent,
      reasonCode,
      title: `${agentLabel} not applicable`,
      detail: "This dataset supports descriptive insights; outcome prediction is out of scope for exploratory runs.",
    };
  }

  if (reasonCode === "target_missing") {
    return {
      agent,
      reasonCode,
      title: `${agentLabel} not available`,
      detail: `${targetDetail} Add an outcome column (e.g., churn, revenue) to enable predictive analysis.`,
    };
  }

  if (intent === "exploratory") {
    return {
      agent,
      reasonCode,
      title: `${agentLabel} not applicable`,
      detail: "Exploratory runs prioritize descriptive insights rather than predictions.",
    };
  }

  return {
    agent,
    reasonCode,
    title: `${agentLabel} not available`,
    detail: constraint.message || "This analysis path is not applicable for the current dataset.",
  };
}
