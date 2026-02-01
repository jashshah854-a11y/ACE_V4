/**
 * Report hooks - composed from smaller focused hooks
 */
export { useReportEvidence } from "./useReportEvidence";
export type {
  EvidenceSummary,
  GovernedInsightSummary,
  UseReportEvidenceResult,
} from "./useReportEvidence";

export { useGovernanceGating } from "./useGovernanceGating";
export type {
  RenderPolicy,
  ScopeConstraint,
  UseGovernanceGatingResult,
} from "./useGovernanceGating";

export { useReportMetrics } from "./useReportMetrics";
export type {
  ScoredSection,
  ClusterMetrics,
  Persona,
  OutcomeModel,
  Anomalies,
  UseReportMetricsResult,
} from "./useReportMetrics";

export { useNarrativeData } from "./useNarrativeData";
export type {
  ExecutiveBrief,
  Conclusion,
  HeroInsight,
  MondayAction,
  NarrativeAssembly,
  UseNarrativeDataResult,
} from "./useNarrativeData";

export { useReportContext } from "./useReportContext";
export type {
  GuidanceSeverity,
  GuidanceNote,
  IdentityStats,
  RunContext,
  NarrativeSummary,
  Highlight,
  RunWarning,
  Profile,
  ScopeLock,
  UseReportContextResult,
} from "./useReportContext";
