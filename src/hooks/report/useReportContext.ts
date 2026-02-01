/**
 * Hook for managing run context, identity, profile, and derived contextual data
 */
import { useMemo } from "react";
import type { RunSnapshot } from "@/lib/api-client";
import type { GovernedReport, TaskContractSnapshot } from "@/hooks/useGovernedReport";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import { getSyntheticTimeColumn } from "@/lib/timelineHelper";
import type { ScoredSection, Anomalies } from "./useReportMetrics";
import type { HeroInsight, MondayAction } from "./useNarrativeData";
import type { ScopeConstraint } from "./useGovernanceGating";

const TIME_TOKENS = [
  "date",
  "time",
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "period",
  "timestamp",
];

export type GuidanceSeverity = "info" | "warning" | "critical";

export interface GuidanceNote {
  id: string;
  message: string;
  severity: GuidanceSeverity;
  source?: string;
}

export interface IdentityStats {
  rows: number | string;
  completeness?: number;
}

export interface RunContext {
  mode: string;
  freshness: string;
  scopeLimits: string[];
}

export interface NarrativeSummary {
  wins: string[];
  risks: string[];
  meaning: string[];
}

export interface Highlight {
  label: string;
  tone: "default" | "warn" | "ok";
}

export interface RunWarning {
  code: string;
  message: string;
  details?: unknown;
}

export interface Profile {
  columns: Record<string, unknown>;
  numericColumns: string[];
}

export interface ScopeLock {
  dimension: string;
  reason: string;
}

interface IdentityProfilePayload {
  columns: Record<string, unknown>;
  numericColumns?: string[];
}

interface IdentityApiResponse {
  identity?: Record<string, unknown>;
  profile?: IdentityProfilePayload;
  summary?: {
    row_count?: number;
    column_count?: number;
    critical_gap_score?: number;
    is_safe_mode?: boolean;
    drift_status?: string;
    quality?: Record<string, unknown>;
    data_type?: Record<string, unknown>;
  };
}

function hasTemporalToken(value: string): boolean {
  const lower = value.toLowerCase();
  return TIME_TOKENS.some((token) => lower.includes(token));
}

function isTemporalMeta(meta: unknown): boolean {
  const record = meta as Record<string, unknown> | null;
  const dtype = String(record?.dtype ?? record?.type ?? "").toLowerCase();
  return hasTemporalToken(dtype);
}

function normalizeColumnMap(raw: unknown): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const map: Record<string, unknown> = {};
    raw.forEach((col: unknown) => {
      if (!col || typeof col !== "object") return;
      const colRecord = col as Record<string, unknown>;
      const name = colRecord.name || colRecord.column;
      if (!name || typeof name !== "string") return;
      map[name] = col;
    });
    return map;
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return undefined;
}

function isNumericColumn(meta: unknown): boolean {
  const record = meta as Record<string, unknown> | null;
  const dtype = String(record?.dtype ?? record?.type ?? "").toLowerCase();
  return ["int", "float", "double", "decimal", "number"].some((token) =>
    dtype.includes(token)
  );
}

function extractPrimaryQuestion(
  taskContract?: string,
  decisionCopy?: string
): string | undefined {
  const corpus = taskContract || decisionCopy || "";
  if (!corpus) return undefined;
  const match = corpus.match(/primary\s+(?:decision|question)[^:]*:\s*(.+)/i);
  if (match) {
    return match[1].split("\n")[0]?.trim();
  }
  const firstLine = corpus.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.replace(/^[-*#\d.\)\s]+/, "").trim();
}

function extractSuccessCriteria(
  taskContract?: string,
  decisionCopy?: string
): string | undefined {
  const corpus = taskContract || decisionCopy || "";
  if (!corpus) return undefined;
  const match = corpus.match(/success\s+(?:criteria|signal)[^:]*:\s*(.+)/i);
  if (match) {
    return match[1].split("\n")[0]?.trim();
  }
  const candidate = corpus
    .split("\n")
    .find((line) => line.toLowerCase().includes("success"));
  return candidate?.replace(/^[-*#\d.\)\s]+/, "").trim();
}

function extractOutOfScope(contractCopy?: string): string[] {
  if (!contractCopy) return [];
  const lines = contractCopy.split("\n");
  const dims = new Set<string>();
  let capture = false;
  lines.forEach((line) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed) {
      capture = false;
      return;
    }
    if (
      lower.includes("out of scope") ||
      lower.startsWith("excluded") ||
      lower.startsWith("not in scope")
    ) {
      const afterColon = trimmed.split(":")[1];
      if (afterColon && afterColon.trim()) {
        dims.add(afterColon.trim());
      }
      capture = true;
      return;
    }
    if (capture && (trimmed.startsWith("-") || trimmed.startsWith("*"))) {
      dims.add(trimmed.replace(/^[-*]\s*/, ""));
      return;
    }
    if (capture) {
      capture = false;
    }
  });
  return Array.from(dims);
}

function buildContractSummary(
  contract?: TaskContractSnapshot
): string | undefined {
  if (!contract) return undefined;
  const parts: string[] = [];
  if (contract.primary_question)
    parts.push(`Primary Question: ${contract.primary_question}`);
  if (contract.decision_context)
    parts.push(`Decision Context: ${contract.decision_context}`);
  if (contract.required_output_type)
    parts.push(`Output Type: ${contract.required_output_type}`);
  if (contract.success_criteria)
    parts.push(`Success Criteria: ${contract.success_criteria}`);
  if (contract.constraints) parts.push(`Constraints: ${contract.constraints}`);
  const scope = contract.out_of_scope_dimensions?.length
    ? contract.out_of_scope_dimensions
    : contract.scope_exclusions;
  if (scope && scope.length) {
    parts.push(`Out-of-scope: ${scope.join(", ")}`);
  }
  return parts.join("\n");
}

export interface UseReportContextResult {
  // Identity & Profile
  identityCard: Record<string, unknown> | null;
  identitySafeMode: boolean | undefined;
  identityColumns: Record<string, unknown> | undefined;
  derivedNumericColumns: string[];
  identityStats: IdentityStats;
  profile: Profile | undefined;

  // Timeline
  syntheticTimeColumn: string | undefined;
  hasTimeField: boolean;

  // Contract & Decision
  taskContractSection: { title: string; content: string } | undefined;
  decisionSection: { title: string; content: string } | undefined;
  decisionSummary: string | undefined;
  taskContractSummary: string | undefined;
  primaryQuestion: string | undefined;
  successCriteria: string | undefined;
  outOfScopeDimensions: string[];
  scopeLocks: ScopeLock[];

  // Run Context
  runContext: RunContext;
  runWarnings: RunWarning[];

  // Enhanced Analytics & Diagnostics
  enhancedAnalytics: Record<string, unknown> | null;
  gatedEnhancedAnalytics: Record<string, unknown> | null;
  diagnostics: Record<string, unknown> | null;
  modelArtifacts: unknown;
  analyticsLoading: boolean;

  // Derived
  dataQualityValue: number | undefined;
  guidanceNotes: GuidanceNote[];
  highlights: Highlight[];
  narrativeSummary: NarrativeSummary;
  uncertaintySignals: string[];
  governanceWarnings: string[];
  filteredSections: Array<{ title: string; content: string }>;
  evidenceSections: Array<{ title: string; content: string }>;
}

export function useReportContext(
  reportContent: string,
  runId: string | undefined,
  snapshot: RunSnapshot | null | undefined,
  governedReport: GovernedReport | null | undefined,
  sections: Array<{ title: string; content: string }>,
  metrics: Record<string, unknown>,
  scoredSections: ScoredSection[],
  heroInsight: HeroInsight,
  mondayActions: MondayAction[],
  keyTakeaways: string[],
  personas: Array<{ label?: string; [key: string]: unknown }>,
  gatedAnomalies: Anomalies | null,
  safeMode: boolean,
  limitationsMode: boolean,
  scopeConstraints: ScopeConstraint[],
  renderPolicy: Record<string, boolean> | undefined,
  isFallbackReport: boolean
): UseReportContextResult {
  const contractSnapshot = governedReport?.task_contract;
  const runManifest = snapshot?.manifest ?? null;

  // Remote artifact for timeline
  const { data: timelineSelection } = useRemoteArtifact<{ column?: string }>(
    undefined,
    "timeline"
  );

  // Enhanced analytics and diagnostics from snapshot
  const analyticsLoading = false;
  const enhancedAnalytics = (snapshot?.enhanced_analytics as Record<string, unknown>) ?? null;
  const diagnostics = (snapshot?.diagnostics as Record<string, unknown>) ?? null;
  const modelArtifacts = snapshot?.model_artifacts ?? null;
  const identityPayload =
    (snapshot?.identity as IdentityApiResponse | undefined) ?? null;

  // Gated enhanced analytics based on render policy
  const gatedEnhancedAnalytics = useMemo(() => {
    if (!enhancedAnalytics) return null;
    if (!renderPolicy) return enhancedAnalytics;
    const next = { ...enhancedAnalytics };
    if (!renderPolicy.allow_correlation_analysis) {
      next.correlation_analysis = null;
      next.correlation_ci = null;
    }
    if (!renderPolicy.allow_distribution_analysis)
      next.distribution_analysis = null;
    if (!renderPolicy.allow_quality_metrics) next.quality_metrics = null;
    if (!renderPolicy.allow_business_intelligence)
      next.business_intelligence = null;
    if (!renderPolicy.allow_feature_importance) next.feature_importance = null;
    return next;
  }, [enhancedAnalytics, renderPolicy]);

  // Identity
  const identityCard = useMemo(
    () =>
      (identityPayload?.identity as Record<string, unknown>) ||
      (diagnostics?.identity as Record<string, unknown>) ||
      null,
    [identityPayload?.identity, diagnostics?.identity]
  );

  const identitySafeMode = useMemo(
    () =>
      identityPayload?.summary?.is_safe_mode ??
      (identityCard?.is_safe_mode as boolean | undefined),
    [identityPayload?.summary?.is_safe_mode, identityCard?.is_safe_mode]
  );

  const identityColumns = useMemo(() => {
    if (identityPayload?.profile?.columns) {
      return identityPayload.profile.columns;
    }
    const diagIdentity = diagnostics?.identity as Record<string, unknown> | undefined;
    const rawColumns =
      diagIdentity?.columns ||
      (diagIdentity?.schema as Record<string, unknown>)?.columns ||
      (gatedEnhancedAnalytics?.quality_metrics as Record<string, unknown>)?.columns ||
      null;
    return normalizeColumnMap(rawColumns);
  }, [
    identityPayload?.profile?.columns,
    diagnostics?.identity,
    gatedEnhancedAnalytics?.quality_metrics,
  ]);

  const derivedNumericColumns = useMemo(() => {
    if (identityPayload?.profile?.numericColumns?.length) {
      return identityPayload.profile.numericColumns as string[];
    }
    if (!identityColumns) return [] as string[];
    return Object.entries(identityColumns)
      .filter(([, col]) => isNumericColumn(col))
      .map(([name]) => name);
  }, [identityPayload?.profile?.numericColumns, identityColumns]);

  const syntheticTimeColumn = useMemo(() => {
    if (timelineSelection?.column) {
      return timelineSelection.column;
    }
    return runId ? getSyntheticTimeColumn(runId) : undefined;
  }, [timelineSelection?.column, runId]);

  // Time field detection
  const hasTimeField = useMemo(() => {
    if (syntheticTimeColumn) return true;
    if (identityColumns && Object.keys(identityColumns).length) {
      const entryMatch = Object.entries(identityColumns).some(
        ([name, meta]) =>
          (name ? hasTemporalToken(name) : false) || isTemporalMeta(meta)
      );
      if (entryMatch) return true;
    }
    const diagIdentity = diagnostics?.identity as Record<string, unknown> | undefined;
    const schemaColumns = (diagIdentity?.schema as Record<string, unknown>)?.columns;
    if (Array.isArray(schemaColumns)) {
      const match = schemaColumns.some((col: unknown) => {
        const colRecord = col as Record<string, unknown>;
        const label = String(colRecord?.name || colRecord?.column || "");
        return hasTemporalToken(label) || isTemporalMeta(col);
      });
      if (match) return true;
    }
    const lower = reportContent.toLowerCase();
    return TIME_TOKENS.some((token) => lower.includes(token));
  }, [syntheticTimeColumn, identityColumns, diagnostics?.identity, reportContent]);

  // Section extraction
  const taskContractSection = useMemo(
    () => sections.find((s) => s.title.toLowerCase().includes("contract")),
    [sections]
  );

  const decisionSection = useMemo(
    () =>
      sections.find(
        (s) =>
          s.title.toLowerCase().includes("decision") ||
          s.title.toLowerCase().includes("purpose")
      ),
    [sections]
  );

  const summarize = (text?: string) =>
    text ? text.split("\n").slice(0, 4).join("\n").slice(0, 600) : undefined;

  const decisionSummary = useMemo(
    () => summarize(decisionSection?.content),
    [decisionSection?.content]
  );

  const structuredContractSummary = useMemo(
    () => buildContractSummary(contractSnapshot),
    [contractSnapshot]
  );

  const taskContractSummary = useMemo(
    () => structuredContractSummary || summarize(taskContractSection?.content),
    [structuredContractSummary, taskContractSection?.content]
  );

  const primaryQuestion = useMemo(
    () =>
      contractSnapshot?.primary_question ||
      extractPrimaryQuestion(
        taskContractSection?.content,
        decisionSection?.content
      ),
    [
      contractSnapshot?.primary_question,
      taskContractSection?.content,
      decisionSection?.content,
    ]
  );

  const successCriteria = useMemo(
    () =>
      contractSnapshot?.success_criteria ||
      extractSuccessCriteria(
        taskContractSection?.content,
        decisionSection?.content
      ),
    [
      contractSnapshot?.success_criteria,
      taskContractSection?.content,
      decisionSection?.content,
    ]
  );

  const outOfScopeDimensions = useMemo(() => {
    const structured =
      (contractSnapshot?.out_of_scope_dimensions &&
      contractSnapshot.out_of_scope_dimensions.length
        ? contractSnapshot.out_of_scope_dimensions
        : contractSnapshot?.scope_exclusions) || ([] as string[]);
    if (structured.length) {
      return structured;
    }
    return extractOutOfScope(taskContractSection?.content);
  }, [
    contractSnapshot?.out_of_scope_dimensions,
    contractSnapshot?.scope_exclusions,
    taskContractSection?.content,
  ]);

  const scopeLocks = useMemo(() => {
    if (!outOfScopeDimensions?.length) return [];
    return outOfScopeDimensions.map((dimension) => ({
      dimension,
      reason: "Excluded by Task Contract",
    }));
  }, [outOfScopeDimensions]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      const lowerTitle = s.title.toLowerCase();
      const lowerContent = s.content.toLowerCase();
      if (
        !hasTimeField &&
        (lowerTitle.includes("time") ||
          lowerTitle.includes("forecast") ||
          lowerContent.includes("time-series") ||
          lowerContent.includes("forecast"))
      ) {
        return false;
      }
      return true;
    });
  }, [sections, hasTimeField]);

  const evidenceSections = useMemo(
    () =>
      filteredSections.filter((s) => {
        const lower = s.content.toLowerCase();
        return (
          lower.includes("evidence") ||
          lower.includes("column") ||
          lower.includes("data")
        );
      }),
    [filteredSections]
  );

  // Computed values
  const dataQualityValue = useMemo(() => {
    if (typeof metrics.dataQualityScore === "number")
      return Number(metrics.dataQualityScore);
    if (Number.isFinite(Number(metrics.dataQualityScore)))
      return Number(metrics.dataQualityScore);
    const diagDataQuality = diagnostics?.data_quality as number | Record<string, unknown> | undefined;
    const diagScore =
      typeof diagDataQuality === "number"
        ? diagDataQuality
        : (diagDataQuality as Record<string, unknown>)?.score;
    if (typeof diagScore === "number") {
      return diagScore > 1 ? diagScore : diagScore * 100;
    }
    return undefined;
  }, [metrics.dataQualityScore, diagnostics?.data_quality]);

  const identityStats = useMemo(
    () => ({
      rows:
        identityPayload?.summary?.row_count ??
        (gatedEnhancedAnalytics?.quality_metrics as Record<string, unknown>)?.total_records ??
        metrics.totalRows ??
        "n/a",
      completeness:
        identityPayload?.summary?.quality?.avg_null_pct !== undefined
          ? 1 - Number(identityPayload.summary.quality.avg_null_pct)
          : (gatedEnhancedAnalytics?.quality_metrics as Record<string, unknown>)?.overall_completeness as number | undefined,
    }),
    [
      identityPayload?.summary,
      gatedEnhancedAnalytics?.quality_metrics,
      metrics.totalRows,
    ]
  );

  const profile = useMemo(() => {
    if (!identityColumns) return undefined;
    return { columns: identityColumns, numericColumns: derivedNumericColumns };
  }, [identityColumns, derivedNumericColumns]);

  // Uncertainty signals
  const uncertaintySignals = useMemo(() => {
    const lower = reportContent.toLowerCase();
    const signals: string[] = [];
    if (limitationsMode) {
      signals.push("Insights limited by contract or validation gates.");
    }
    if (lower.includes("conflict")) {
      signals.push("Report text mentions conflicts across datasets or models.");
    }
    return signals;
  }, [reportContent, limitationsMode]);

  // Narrative summary
  const narrativeSummary = useMemo(() => {
    const wins: string[] = keyTakeaways.slice(0, 2);
    const risks: string[] = [];
    if (uncertaintySignals.length) {
      risks.push(...uncertaintySignals.slice(0, 2));
    }
    const diagValidation = diagnostics?.validation as Record<string, unknown> | undefined;
    if ((diagValidation?.failed_fields as string[])?.length) {
      risks.push(
        `Validation gaps: ${(diagValidation?.failed_fields as string[])
          .slice(0, 3)
          .join(", ")}`
      );
    }
    const meaning: string[] = [];
    if (safeMode)
      meaning.push(
        "Some outputs are gated for this run; review diagnostics for details."
      );
    if (!hasTimeField)
      meaning.push(
        "Time-based insights are off; add date/time to enable trend views."
      );
    return {
      wins: wins.length ? wins : ["No standout wins detected."],
      risks: risks.length ? risks : ["No major risks detected."],
      meaning: meaning.length
        ? meaning
        : ["Data quality and scope look acceptable for a quick read."],
    };
  }, [
    keyTakeaways,
    uncertaintySignals,
    diagnostics?.validation,
    safeMode,
    hasTimeField,
  ]);

  // Run context
  const runContext = useMemo(() => {
    const mode =
      (diagnostics?.mode as string) ||
      (enhancedAnalytics?.mode as string) ||
      (safeMode ? "safe" : "standard");
    const freshness =
      (enhancedAnalytics?.data_freshness as string) ||
      (metrics.dataFreshness as string) ||
      "unknown";
    const scopeLimits: string[] = [];
    if (!hasTimeField) scopeLimits.push("No time field");
    if (limitationsMode) scopeLimits.push("Limitations mode");
    if (scopeConstraints.length) {
      scopeLimits.push(...scopeConstraints.map((constraint) => constraint.title));
    }
    return {
      mode,
      freshness,
      scopeLimits: scopeLimits.length ? scopeLimits : ["None flagged"],
    };
  }, [
    diagnostics?.mode,
    enhancedAnalytics?.mode,
    enhancedAnalytics?.data_freshness,
    metrics.dataFreshness,
    safeMode,
    hasTimeField,
    limitationsMode,
    scopeConstraints,
  ]);

  // Run warnings
  const runWarnings = useMemo(() => {
    const warnings = Array.isArray(runManifest?.warnings)
      ? runManifest.warnings
      : [];
    const deduped = new Map<string, RunWarning>();
    warnings.forEach((warning: Record<string, unknown>) => {
      if (!warning || !warning.warning_code) return;
      const code = warning.warning_code as string;
      if (!deduped.has(code)) {
        deduped.set(code, {
          code,
          message: warning.message as string,
          details: warning,
        });
      }
    });
    return Array.from(deduped.values());
  }, [runManifest?.warnings]);

  // Governance warnings (currently empty, placeholder for future)
  const governanceWarnings = useMemo(() => {
    return [] as string[];
  }, []);

  // Guidance notes
  const guidanceNotes = useMemo(() => {
    const notes: GuidanceNote[] = [];
    const seen = new Set<string>();

    const register = (
      message?: string,
      severity: GuidanceSeverity = "info",
      source?: string
    ) => {
      if (!message) return;
      const normalized = message.trim();
      if (!normalized) return;
      const key = `${severity}:${source || ""}:${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      notes.push({ id: key, message: normalized, severity, source });
    };

    const diagValidation = diagnostics?.validation as Record<string, unknown> | undefined;
    const validationNotes = diagValidation?.notes;
    if (Array.isArray(validationNotes)) {
      validationNotes.forEach((note) =>
        register(note as string, "warning", "Validation")
      );
    }

    const diagReasons = diagnostics?.reasons;
    if (Array.isArray(diagReasons)) {
      diagReasons.forEach((reason: string) => {
        const lower = reason?.toLowerCase() || "";
        const severity: GuidanceSeverity =
          lower.includes("safe mode") || lower.includes("prohibited")
            ? "critical"
            : "warning";
        register(reason, severity, "Diagnostics");
      });
    }

    if (syntheticTimeColumn) {
      register(
        `Trend analysis currently uses ${syntheticTimeColumn} as a synthetic timeline.`,
        "info",
        "Timeline"
      );
    }

    return notes;
  }, [diagnostics, syntheticTimeColumn]);

  // Highlights
  const highlights = useMemo(() => {
    const chips: Highlight[] = [];
    if (heroInsight?.title)
      chips.push({ label: `Top insight: ${heroInsight.title}`, tone: "default" });
    if (mondayActions?.[0])
      chips.push({
        label: `Top action: ${mondayActions[0].title || "Action 1"}`,
        tone: "default",
      });
    if (personas?.[0]?.label)
      chips.push({ label: `Segment: ${personas[0].label}`, tone: "default" });
    if (gatedAnomalies?.count)
      chips.push({ label: `${gatedAnomalies.count} anomalies`, tone: "warn" });
    if (identityStats.rows && identityStats.rows !== "n/a") {
      chips.push({ label: `Rows: ${identityStats.rows}`, tone: "default" });
    }
    if (chips.length === 0) return [];
    return chips.slice(0, 5);
  }, [
    heroInsight?.title,
    mondayActions,
    personas,
    gatedAnomalies?.count,
    identityStats.rows,
  ]);

  return {
    // Identity & Profile
    identityCard,
    identitySafeMode,
    identityColumns,
    derivedNumericColumns,
    identityStats,
    profile,

    // Timeline
    syntheticTimeColumn,
    hasTimeField,

    // Contract & Decision
    taskContractSection,
    decisionSection,
    decisionSummary,
    taskContractSummary,
    primaryQuestion,
    successCriteria,
    outOfScopeDimensions,
    scopeLocks,

    // Run Context
    runContext,
    runWarnings,

    // Enhanced Analytics & Diagnostics
    enhancedAnalytics,
    gatedEnhancedAnalytics,
    diagnostics,
    modelArtifacts,
    analyticsLoading,

    // Derived
    dataQualityValue,
    guidanceNotes,
    highlights,
    narrativeSummary,
    uncertaintySignals,
    governanceWarnings,
    filteredSections,
    evidenceSections,
  };
}
