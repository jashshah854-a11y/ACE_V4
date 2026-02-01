/**
 * Hook for managing render policy and governance gating
 */
import { useMemo } from "react";
import type { GovernedReport } from "@/hooks/useGovernedReport";
import type { RunSnapshot } from "@/lib/api-client";
import { isManifestCompatible } from "@/hooks/useRunManifest";
import { formatScopeConstraint } from "@/lib/scopeConstraintCopy";

export interface RenderPolicy {
  allow_report?: boolean;
  allow_personas?: boolean;
  allow_anomalies?: boolean;
  allow_regression_sections?: boolean;
  allow_correlation_analysis?: boolean;
  allow_distribution_analysis?: boolean;
  allow_quality_metrics?: boolean;
  allow_business_intelligence?: boolean;
  allow_feature_importance?: boolean;
}

export interface ScopeConstraint {
  title: string;
  description?: string;
  agent?: string;
  reason_code?: string;
}

export interface UseGovernanceGatingResult {
  renderPolicy: RenderPolicy | undefined;
  manifestCompatible: boolean;
  manifestLoading: boolean;
  manifestReady: boolean;
  allowReport: boolean;
  allowPersonas: boolean;
  allowAnomalies: boolean;
  allowRegression: boolean;
  safeMode: boolean;
  limitationsMode: boolean;
  hideActions: boolean;
  shouldEmitInsights: boolean;
  scopeConstraints: ScopeConstraint[];
  rawScopeConstraints: unknown[];
  trustModel: unknown;
}

export function useGovernanceGating(
  snapshot: RunSnapshot | null | undefined,
  governedReport: GovernedReport | null | undefined,
  isFallbackReport: boolean,
  identitySafeMode?: boolean
): UseGovernanceGatingResult {
  const snapshotManifest = snapshot?.manifest ?? null;
  const manifestCompatible = snapshotManifest ? isManifestCompatible(snapshotManifest) : false;
  const manifestLoading = !snapshotManifest;

  const renderPolicy = (snapshot?.render_policy ?? snapshotManifest?.render_policy) as RenderPolicy | undefined;
  const trustModel = snapshot?.trust ?? snapshotManifest?.trust ?? null;
  const manifestReady = Boolean(snapshotManifest && manifestCompatible);

  const allowReport = manifestReady && renderPolicy?.allow_report === true;
  const allowPersonas = renderPolicy?.allow_personas === true;
  const allowAnomalies = renderPolicy?.allow_anomalies === true;
  const allowRegression = renderPolicy?.allow_regression_sections === true;

  const limitationsMode = useMemo(() => {
    return Boolean(governedReport?.mode === "limitations" || isFallbackReport);
  }, [governedReport?.mode, isFallbackReport]);

  const safeMode = useMemo(
    () => limitationsMode || identitySafeMode === true || isFallbackReport,
    [limitationsMode, identitySafeMode, isFallbackReport]
  );

  const hideActions = safeMode;

  const shouldEmitInsights = useMemo(
    () => !isFallbackReport && !limitationsMode && identitySafeMode !== true,
    [limitationsMode, identitySafeMode, isFallbackReport]
  );

  const analysisIntent = governedReport?.analysis_intent;
  const targetCandidate = governedReport?.target_candidate;

  const scopeConstraints = useMemo(() => {
    const rawConstraints = governedReport?.scope_constraints;
    return (Array.isArray(rawConstraints) ? rawConstraints : [])
      .filter((constraint): constraint is Record<string, unknown> =>
        constraint != null && typeof constraint === "object"
      )
      .map((constraint) => formatScopeConstraint(constraint, analysisIntent, targetCandidate));
  }, [governedReport?.scope_constraints, analysisIntent, targetCandidate]);

  const rawScopeConstraints = governedReport?.scope_constraints || [];

  return {
    renderPolicy,
    manifestCompatible,
    manifestLoading,
    manifestReady,
    allowReport,
    allowPersonas,
    allowAnomalies,
    allowRegression,
    safeMode,
    limitationsMode,
    hideActions,
    shouldEmitInsights,
    scopeConstraints,
    rawScopeConstraints,
    trustModel,
  };
}
