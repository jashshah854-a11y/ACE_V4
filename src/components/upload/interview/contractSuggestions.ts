/**
 * Utility functions for generating contract suggestions from dataset identity.
 */
import type { DatasetIdentity } from "@/lib/api-client";

export interface ContractSuggestionPayload {
  decisionContext: string;
  primaryQuestion: string;
  successCriteria: string;
  forbiddenClaims: string[];
}

export function normalizeCapabilities(
  input:
    | DatasetIdentity["detected_capabilities"]
    | Record<string, boolean>
    | undefined
    | null
): Record<string, boolean> {
  if (!input) {
    return {} as Record<string, boolean>;
  }

  if (Array.isArray(input)) {
    return input.reduce<Record<string, boolean>>((acc, capability) => {
      if (typeof capability === "string") {
        acc[capability] = true;
      }
      return acc;
    }, {});
  }

  if (typeof input === "object") {
    return Object.entries(
      input as Record<string, boolean | number | string | undefined>
    ).reduce<Record<string, boolean>>((acc, [key, value]) => {
      acc[key] = Boolean(value);
      return acc;
    }, {});
  }

  return {} as Record<string, boolean>;
}

export function buildContractSuggestion(
  identity: DatasetIdentity,
  capabilities: Record<string, boolean>
): ContractSuggestionPayload {
  const rowCount = identity?.row_count ?? 0;
  const columnCount = identity?.column_count ?? 0;
  const warnings = identity?.warnings ?? [];

  const hasFinancial = capabilities["has_financial_columns"];
  const hasTime =
    capabilities["has_time_series"] || capabilities["has_time_column"];
  const hasCategorical = capabilities["has_categorical"];

  const decisionDecision = hasFinancial
    ? "decide whether to adjust monetization levers this quarter"
    : hasTime
      ? "decide whether to accelerate investment where velocity is rising or intervene where it is fading"
      : "decide which retention playbook to activate immediately";

  const decisionContext = `Leadership needs to ${decisionDecision} by interrogating ${rowCount.toLocaleString()} records across ${columnCount} tracked signals in this dataset.`;

  const primaryQuestion = hasFinancial
    ? "Which customer or product segments are driving the biggest revenue swings?"
    : hasTime
      ? "Where do we see the sharpest acceleration or slowdown across the observed timeline?"
      : "Which cohorts drive the majority of attrition so we can stabilize them first?";

  const successCriteria = hasFinancial
    ? "Success = isolate segments causing >10% of revenue variation so we can intervene with pricing or retention plays."
    : hasTime
      ? "Success = confirm the top inflection points in activity so we can explain the change in direction."
      : "Success = surface one segment responsible for at least 15% of churn so we can deploy a save plan.";

  const suggestedClaims = new Set<string>();

  if (!hasFinancial) {
    suggestedClaims.add("no_revenue_inference");
  }
  if (!hasCategorical) {
    suggestedClaims.add("no_persona_segmentation");
  }
  suggestedClaims.add("no_causal_claims");
  if (warnings.length) {
    suggestedClaims.add("strict_mode");
  }

  return {
    decisionContext,
    primaryQuestion,
    successCriteria,
    forbiddenClaims: Array.from(suggestedClaims),
  };
}
