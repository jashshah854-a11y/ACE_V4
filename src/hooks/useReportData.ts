/**
 * useReportData - Composed hook for report data extraction and processing
 *
 * This hook orchestrates 5 smaller, focused hooks:
 * 1. useReportEvidence - Evidence data and governed insights
 * 2. useGovernanceGating - Render policy and governance gating
 * 3. useReportMetrics - Metrics, sections, personas, anomalies
 * 4. useNarrativeData - Narrative components (brief, insights, actions)
 * 5. useReportContext - Identity, profile, context, and derived data
 */
import { useMemo } from "react";
import type { GovernedReport } from "@/hooks/useGovernedReport";
import type { RunSnapshot } from "@/lib/api-client";
import type { ReportDataResult } from "@/types/reportTypes";
import { transformAPIResponse, filterSuppressedSections } from "@/lib/reportViewModel";
import { ensureSafeReport } from "@/lib/ReportGuard";

// Import composed hooks
import { useReportEvidence } from "./report/useReportEvidence";
import { useGovernanceGating } from "./report/useGovernanceGating";
import { useReportMetrics } from "./report/useReportMetrics";
import { useNarrativeData } from "./report/useNarrativeData";
import { useReportContext } from "./report/useReportContext";

export function useReportData(
  content: string,
  runId: string | undefined,
  confidenceMode: "strict" | "exploratory",
  governedReport?: GovernedReport | null,
  snapshot?: RunSnapshot | null
): ReportDataResult {
  // Extract analysis intent and target candidate from governed report
  const analysisIntent = governedReport?.analysis_intent;
  const targetCandidate = governedReport?.target_candidate;

  // 1. Evidence and governed insights
  const { evidenceMap, evidenceScopeMap, governedInsights } =
    useReportEvidence(governedReport);

  // 2. Governance gating
  const {
    renderPolicy,
    manifestCompatible,
    manifestLoading,
    manifestReady,
    allowReport,
    allowPersonas,
    allowAnomalies,
    allowRegression,
    safeMode: governanceSafeMode,
    limitationsMode,
    hideActions,
    shouldEmitInsights,
    scopeConstraints,
    rawScopeConstraints,
    trustModel,
  } = useGovernanceGating(
    snapshot,
    governedReport,
    false, // isFallbackReport - computed below
    undefined // identitySafeMode - computed below
  );

  // Gate content based on manifest
  const reportContent = allowReport ? content : "";

  // 3. Report metrics
  const {
    metrics,
    progressMetrics,
    sections,
    scoredSections,
    segmentData,
    compositionData,
    measurableSegments,
    rawClusterMetrics,
    clusterMetrics,
    rawPersonas,
    personas,
    outcomeModel,
    gatedOutcomeModel,
    anomalies,
    gatedAnomalies,
    isFallbackReport,
  } = useReportMetrics(
    reportContent,
    evidenceScopeMap,
    allowPersonas,
    allowAnomalies,
    allowRegression
  );

  // 4. Narrative data
  const {
    executiveBrief,
    conclusion,
    heroInsight,
    mondayActions,
    segmentComparisonData,
    keyTakeaways,
    narrativeAssembly,
  } = useNarrativeData(
    reportContent,
    metrics,
    gatedAnomalies,
    scoredSections,
    isFallbackReport
  );

  // Re-compute governance with actual isFallbackReport
  const {
    safeMode,
    limitationsMode: actualLimitationsMode,
    hideActions: actualHideActions,
    shouldEmitInsights: actualShouldEmitInsights,
  } = useGovernanceGating(snapshot, governedReport, isFallbackReport, undefined);

  // 5. Report context (identity, profile, derived data)
  const {
    identityCard,
    identitySafeMode,
    identityColumns,
    derivedNumericColumns,
    identityStats,
    profile,
    syntheticTimeColumn,
    hasTimeField,
    taskContractSection,
    decisionSection,
    decisionSummary,
    taskContractSummary,
    primaryQuestion,
    successCriteria,
    outOfScopeDimensions,
    scopeLocks,
    runContext,
    runWarnings,
    enhancedAnalytics,
    gatedEnhancedAnalytics,
    diagnostics,
    modelArtifacts,
    analyticsLoading,
    dataQualityValue,
    guidanceNotes,
    highlights,
    narrativeSummary,
    uncertaintySignals,
    governanceWarnings,
    filteredSections: contextFilteredSections,
    evidenceSections,
  } = useReportContext(
    reportContent,
    runId,
    snapshot,
    governedReport,
    sections,
    metrics,
    scoredSections,
    heroInsight,
    mondayActions,
    keyTakeaways,
    personas,
    gatedAnomalies,
    safeMode,
    actualLimitationsMode,
    scopeConstraints,
    renderPolicy as Record<string, boolean> | undefined,
    isFallbackReport
  );

  // Apply additional section filtering
  const filteredSections = useMemo(() => {
    return filterSuppressedSections(contextFilteredSections);
  }, [contextFilteredSections]);

  // Build view model
  const viewModel = useMemo(() => {
    const tempResult = {
      metrics,
      dataQualityValue,
      safeMode,
      limitationsMode: actualLimitationsMode,
      primaryQuestion,
      successCriteria,
      decisionSummary,
      executiveBrief,
      heroInsight,
      runId,
      evidenceSections: evidenceSections || [],
      sections,
    };
    const baseModel = transformAPIResponse(tempResult);
    return {
      ...baseModel,
      sections: baseModel.sections,
    };
  }, [
    metrics,
    dataQualityValue,
    safeMode,
    actualLimitationsMode,
    primaryQuestion,
    successCriteria,
    decisionSummary,
    executiveBrief,
    heroInsight,
    evidenceSections,
    sections,
    runId,
  ]);

  // Get run manifest from snapshot
  const runManifest = snapshot?.manifest ?? null;

  // Return with safe defaults via Report Guard
  return ensureSafeReport({
    metrics: metrics || {},
    progressMetrics: progressMetrics || {},
    sections: sections || [],
    segmentData: segmentData || [],
    compositionData: compositionData || [],
    measurableSegments: measurableSegments || [],
    clusterMetrics,
    personas: Array.isArray(personas) ? personas : [],
    outcomeModel: gatedOutcomeModel,
    anomalies: gatedAnomalies || { count: 0, drivers: [] },
    executiveBrief: executiveBrief || {
      purpose: "",
      keyFindings: [],
      confidenceVerdict: "",
      recommendedAction: "",
    },
    conclusion: conclusion || {
      shouldUseFor: [],
      shouldNotUseFor: [],
      nextStep: "",
    },
    heroInsight: heroInsight || {
      keyInsight: "",
      impact: "medium" as const,
      trend: "neutral" as const,
      confidence: 0,
      dataQuality: 0,
      recommendation: "",
    },
    mondayActions: mondayActions || [],
    segmentComparisonData: segmentComparisonData || [],
    keyTakeaways: keyTakeaways || [],
    dataQualityValue,
    limitationsMode: actualLimitationsMode,
    safeMode,
    hideActions: actualHideActions,
    shouldEmitInsights: actualShouldEmitInsights,
    hasTimeField,
    taskContractSection,
    decisionSection,
    decisionSummary,
    taskContractSummary,
    filteredSections: filteredSections || [],
    evidenceSections: evidenceSections || [],
    uncertaintySignals: uncertaintySignals || [],
    narrativeSummary: narrativeSummary || { wins: [], risks: [], meaning: [] },
    runContext: runContext || {
      mode: "standard",
      freshness: "unknown",
      scopeLimits: [],
    },
    identityStats: identityStats || { rows: "n/a", completeness: undefined },
    highlights: highlights || [],
    primaryQuestion,
    successCriteria,
    outOfScopeDimensions,
    scoredSections,
    governanceWarnings,
    scopeLocks,
    analysisIntent,
    targetCandidate,
    scopeConstraints,
    rawScopeConstraints,
    governingThought: narrativeAssembly.governingThought,
    trustModel,
    narrativeModules: narrativeAssembly.primary,
    appendixModules: narrativeAssembly.appendix,
    enhancedAnalytics: gatedEnhancedAnalytics,
    analyticsLoading,
    diagnostics,
    modelArtifacts,
    viewModel,
    profile,
    syntheticTimeColumn,
    guidanceNotes,
    runWarnings,
    runManifest,
    manifestLoading,
    manifestCompatible,
    renderPolicy,
    viewPolicies: snapshot?.view_policies ?? runManifest?.view_policies,
    analysisAllowed: runManifest?.analysis_allowed,
    analysisSuppressed: runManifest?.analysis_suppressed,
    evidenceMap,
    governedInsights,
  });
}

// Re-export types from child hooks for convenience
export type { EvidenceSummary, GovernedInsightSummary } from "./report/useReportEvidence";
export type { RenderPolicy, ScopeConstraint } from "./report/useGovernanceGating";
export type { ScoredSection, ClusterMetrics, Persona, OutcomeModel, Anomalies } from "./report/useReportMetrics";
export type { ExecutiveBrief, Conclusion, HeroInsight, MondayAction } from "./report/useNarrativeData";
export type { GuidanceNote, GuidanceSeverity, Profile, RunWarning } from "./report/useReportContext";
