import { useMemo, useEffect } from "react";
import {
  extractMetrics,
  extractSections,
  extractProgressMetrics,
  extractChartData,
  parseClusterMetrics,
  extractPersonas,
  extractOutcomeModel,
  extractAnomalies,
} from "@/lib/reportParser";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";
import { extractExecutiveBrief, extractConclusion } from "@/lib/narrativeExtractors";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import { getSyntheticTimeColumn } from "@/lib/timelineHelper";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useModelArtifacts } from "@/hooks/useModelArtifacts";
import { useRunManifest } from "@/hooks/useRunManifest";
import type { GovernedReport, TaskContractSnapshot } from "@/hooks/useGovernedReport";
import type {
  ReportDataResult,
  GuidanceNote,
  GuidanceSeverity,
  EvidenceSummary,
  GovernedInsightSummary,
} from "@/types/reportTypes";
import { transformAPIResponse, filterSuppressedSections } from "@/lib/reportViewModel";
import { ensureSafeReport } from "@/lib/ReportGuard";
import { assembleNarrative, type NarrativeModule } from "@/lib/meaningAssembler";
import { formatScopeConstraint } from "@/lib/scopeConstraintCopy";

const MIN_IMPORTANCE = 0.05;

const TIME_TOKENS = [
  "date",
  "time",
  "day",
  "week",
  "month",
  "quarter",
  "year",
  "period",
  "timestamp"
];

interface EvidenceSummary {
  id: string;
  title: string;
  method?: string;
  columns: string[];
  confidence?: number;
  scope?: string;
  sourceCode?: string;
  dataSource?: string;
  sourceNotes?: string;
  raw?: any;
}

interface GovernedInsightSummary {
  id: string;
  claim?: string;
  agent?: string;
  severity?: string;
  metricName?: string;
  evidenceId?: string;
  columns?: string[];
  confidence?: number;
  impact?: string;
  evidence?: EvidenceSummary;
}


function hasTemporalToken(value: string): boolean {
  const lower = value.toLowerCase();
  return TIME_TOKENS.some((token) => lower.includes(token));
}

function isTemporalMeta(meta: any): boolean {
  const dtype = String(meta?.dtype ?? meta?.type ?? '').toLowerCase();
  return hasTemporalToken(dtype);
}

interface IdentityProfilePayload {
  columns: Record<string, any>;
  numericColumns?: string[];
}

interface IdentityApiResponse {
  identity?: Record<string, any>;
  profile?: IdentityProfilePayload;
  summary?: {
    row_count?: number;
    column_count?: number;
    critical_gap_score?: number;
    is_safe_mode?: boolean;
    drift_status?: string;
    quality?: Record<string, any>;
    data_type?: Record<string, any>;
  };
}

function normalizeColumnMap(raw: any): Record<string, any> | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const map: Record<string, any> = {};
    raw.forEach((col: any, index: number) => {
      if (!col || typeof col !== "object") return;
      const name = col.name || col.column || column_;
      if (!name) return;
      map[name] = col;
    });
    return map;
  }
  if (typeof raw === "object") {
    return raw as Record<string, any>;
  }
  return undefined;
}

function isNumericColumn(meta: any): boolean {
  const dtype = String(meta?.dtype ?? meta?.type ?? "").toLowerCase();
  return ["int", "float", "double", "decimal", "number"].some((token) => dtype.includes(token));
}

function parseImportanceFromContent(content: string, index: number) {
  const importanceMatch = content.match(/importance(?:\s*score)?[:\s]+(\d+(?:\.\d+)?)/i);
  if (importanceMatch) {
    const raw = parseFloat(importanceMatch[1]);
    if (!Number.isNaN(raw)) {
      const normalized = raw > 1 ? raw / 100 : raw;
      return Math.max(MIN_IMPORTANCE, Math.min(1, normalized));
    }
  }
  if (/executive|summary/.test(content.toLowerCase())) {
    return 0.9;
  }
  return Math.max(MIN_IMPORTANCE, 0.75 - index * 0.05);
}

function extractPrimaryQuestion(taskContract?: string, decisionCopy?: string) {
  const corpus = taskContract || decisionCopy || "";
  if (!corpus) return undefined;
  const match = corpus.match(/primary\s+(?:decision|question)[^:]*:\s*(.+)/i);
  if (match) {
    return match[1].split("\n")[0]?.trim();
  }
  const firstLine = corpus.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.replace(/^[-*#\d.\)\s]+/, "").trim();
}

function extractSuccessCriteria(taskContract?: string, decisionCopy?: string) {
  const corpus = taskContract || decisionCopy || "";
  if (!corpus) return undefined;
  const match = corpus.match(/success\s+(?:criteria|signal)[^:]*:\s*(.+)/i);
  if (match) {
    return match[1].split("\n")[0]?.trim();
  }
  const candidate = corpus.split("\n").find((line) => line.toLowerCase().includes("success"));
  return candidate?.replace(/^[-*#\d.\)\s]+/, "").trim();
}

function extractOutOfScope(contractCopy?: string) {
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
    if (lower.includes("out of scope") || lower.startsWith("excluded") || lower.startsWith("not in scope")) {
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

function buildContractSummary(contract?: TaskContractSnapshot) {
  if (!contract) return undefined;
  const parts: string[] = [];
  if (contract.primary_question) parts.push(`Primary Question: ${contract.primary_question}`);
  if (contract.decision_context) parts.push(`Decision Context: ${contract.decision_context}`);
  if (contract.required_output_type) parts.push(`Output Type: ${contract.required_output_type}`);
  if (contract.success_criteria) parts.push(`Success Criteria: ${contract.success_criteria}`);
  if (contract.constraints) parts.push(`Constraints: ${contract.constraints}`);
  const scope = contract.out_of_scope_dimensions?.length
    ? contract.out_of_scope_dimensions
    : contract.scope_exclusions;
  if (scope && scope.length) {
    parts.push(`Out-of-scope: ${scope.join(", ")}`);
  }
  return parts.join(`\n`);
}

export function useReportData(
  content: string,
  runId: string | undefined,
  confidenceMode: "strict" | "exploratory",
  governedReport?: GovernedReport | null
): ReportDataResult {
  const contractSnapshot = governedReport?.task_contract;
  const analysisIntent = governedReport?.analysis_intent;
  const targetCandidate = governedReport?.target_candidate;
  const { data: runManifest, loading: manifestLoading, compatible: manifestCompatible } = useRunManifest(runId);
  const renderPolicy = runManifest?.render_policy;
  const trustModel = runManifest?.trust ?? null;
  const manifestReady = Boolean(runManifest && manifestCompatible);
  const allowReport = manifestReady && renderPolicy?.allow_report === true;
  const reportContent = allowReport ? content : "";
  const gatedRunId = manifestReady ? runId : undefined;
  const allowPersonas = renderPolicy?.allow_personas === true;
  const allowAnomalies = renderPolicy?.allow_anomalies === true;
  const allowRegression = renderPolicy?.allow_regression_sections === true;

  const evidenceMap = useMemo(() => normalizeEvidenceMap(governedReport?.evidence), [governedReport?.evidence]);
  const evidenceScopeMap = useMemo(() => {
    const scopeIndex: Record<string, EvidenceSummary> = {};
    Object.values(evidenceMap).forEach((entry) => {
      if (entry?.scope) {
        scopeIndex[entry.scope] = entry;
      }
    });
    return scopeIndex;
  }, [evidenceMap]);
  const governedInsights = useMemo(
    () => normalizeGovernedInsights(governedReport?.insights, evidenceMap),
    [governedReport?.insights, evidenceMap]
  );
  const scopeConstraints = useMemo(() => {
    return (Array.isArray(governedReport?.scope_constraints) ? governedReport?.scope_constraints : [])
      .filter((constraint) => constraint && typeof constraint === "object")
      .map((constraint) => formatScopeConstraint(constraint, analysisIntent, targetCandidate));
  }, [governedReport?.scope_constraints, analysisIntent, targetCandidate]);

  const rawScopeConstraints = governedReport?.scope_constraints || [];

  const { data: enhancedAnalytics, loading: analyticsLoading } = useEnhancedAnalytics(gatedRunId);
  const { data: diagnostics } = useDiagnostics(gatedRunId);
  const { data: modelArtifacts } = useModelArtifacts(gatedRunId);
  const { data: identityPayload } = useRemoteArtifact<IdentityApiResponse>(gatedRunId, "identity");
  const { data: timelineSelection } = useRemoteArtifact<{ column?: string }>(gatedRunId, "timeline");

  const gatedEnhancedAnalytics = useMemo(() => {
    if (!enhancedAnalytics) return null;
    if (!renderPolicy) return enhancedAnalytics;
    const next = { ...enhancedAnalytics };
    if (!renderPolicy.allow_correlation_analysis) next.correlation_analysis = null;
    if (!renderPolicy.allow_distribution_analysis) next.distribution_analysis = null;
    if (!renderPolicy.allow_quality_metrics) next.quality_metrics = null;
    if (!renderPolicy.allow_business_intelligence) next.business_intelligence = null;
    if (!renderPolicy.allow_feature_importance) next.feature_importance = null;
    return next;
  }, [enhancedAnalytics, renderPolicy]);

  const identityCard = identityPayload?.identity || diagnostics?.identity || null;
  const identitySafeMode = identityPayload?.summary?.is_safe_mode ?? identityCard?.is_safe_mode;

  const identityColumns = useMemo(() => {
    if (identityPayload?.profile?.columns) {
      return identityPayload.profile.columns;
    }
    const rawColumns =
      diagnostics?.identity?.columns ||
      diagnostics?.identity?.schema?.columns ||
      gatedEnhancedAnalytics?.quality_metrics?.columns ||
      null;
    return normalizeColumnMap(rawColumns);
  }, [identityPayload?.profile?.columns, diagnostics?.identity, gatedEnhancedAnalytics?.quality_metrics]);

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

  // DETECT FALLBACK / ERROR REPORT
  const isFallbackReport = useMemo(() => {
    const lower = reportContent.toLowerCase();
    return (
      lower.includes("system notice") ||
      lower.includes("analysis failed") ||
      lower.includes("analysis report (partially_complete)") ||
      // Detect the hard fallback header from server.py
      (lower.includes("# analysis report") && lower.includes("diagnostics"))
    );
  }, [reportContent]);

  // Core extraction
  const metrics = useMemo(() => extractMetrics(reportContent), [reportContent]);
  const progressMetrics = useMemo(() => extractProgressMetrics(reportContent), [reportContent]);
  const sections = useMemo(() => extractSections(reportContent), [reportContent]);
  const scoredSections = useMemo(
    () => sections.map((section, index) => ({ ...section, importance: parseImportanceFromContent(section.content, index) })),
    [sections]
  );
  const { segmentData, compositionData } = useMemo(() => extractChartData(reportContent), [reportContent]);

  const measurableSegments = useMemo(
    () =>
      (segmentData || []).map((seg: any) => ({
        ...seg,
        label: seg?.label ? `${seg.label}` : "Segment",
        subtitle: seg?.avgValue ? `avg=${Math.round(seg.avgValue)}` : undefined,
      })),
    [segmentData]
  );

  const rawClusterMetrics = useMemo(() => parseClusterMetrics(reportContent), [reportContent]);
  const rawPersonas = useMemo(() => extractPersonas(reportContent), [reportContent]);
  const outcomeModel = useMemo(() => extractOutcomeModel(reportContent), [reportContent]);
  const anomalies = useMemo(() => extractAnomalies(reportContent), [reportContent]);
  const gatedOutcomeModel = useMemo(() => (allowRegression ? outcomeModel : null), [outcomeModel, allowRegression]);
  const gatedAnomalies = useMemo(() => (allowAnomalies ? anomalies : null), [anomalies, allowAnomalies]);

  const clusteringEvidenceId = evidenceScopeMap.clustering?.id;
  const clusterMetrics = useMemo(() => {
    if (!rawClusterMetrics || !clusteringEvidenceId) return rawClusterMetrics;
    return { ...rawClusterMetrics, evidenceId: clusteringEvidenceId };
  }, [rawClusterMetrics, clusteringEvidenceId]);

  const personas = useMemo(() => {
    if (!allowPersonas) return [];
    if (!rawPersonas?.length || !clusteringEvidenceId) return rawPersonas;
    return rawPersonas.map((persona) => ({ ...persona, evidenceId: clusteringEvidenceId }));
  }, [rawPersonas, clusteringEvidenceId, allowPersonas]);

  // Narrative components
  const executiveBrief = useMemo(() => {
    if (isFallbackReport) {
      // Manual extraction for fallback reports
      const lines = reportContent.split("\n").filter((line) => line.trim().length > 0);
      const purpose = lines.find((line) => line.toLowerCase().includes("notice")) || "The system encountered an error during analysis.";
      const status = lines.find((line) => line.toLowerCase().includes("status:")) || "Status: Incomplete";
      return {
        purpose: purpose.replace(/^[>#\-\s*]+/, "").trim(),
        keyFindings: [status.replace(/^[>#\-\s*]+/, "").trim()],
        confidenceVerdict: "Low (Fallback)",
        recommendedAction: "Please review the diagnostics section or retry the analysis.",
      };
    }
    return extractExecutiveBrief(reportContent);
  }, [reportContent, isFallbackReport]);

  const conclusion = useMemo(() => extractConclusion(reportContent), [reportContent]);
  const heroInsight = useMemo(() => extractHeroInsight(reportContent, metrics), [reportContent, metrics]);
  const mondayActions = useMemo(
    () => generateMondayActions(reportContent, metrics, gatedAnomalies),
    [reportContent, metrics, gatedAnomalies]
  );
  const segmentComparisonData = useMemo(() => extractSegmentData(reportContent), [reportContent]);

  const keyTakeaways = useMemo(
    () =>
      reportContent
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("*"))
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 20 && line.length < 150)
        .slice(0, 5),
    [reportContent]
  );

  // Computed values
  const dataQualityValue = useMemo(() => {
    if (typeof metrics.dataQualityScore === "number") return Number(metrics.dataQualityScore);
    if (Number.isFinite(Number(metrics.dataQualityScore))) return Number(metrics.dataQualityScore);
    const diagScore = diagnostics?.data_quality && typeof diagnostics.data_quality === 'number'
      ? diagnostics.data_quality
      : diagnostics?.data_quality?.score;
    if (typeof diagScore === "number") {
      return diagScore > 1 ? diagScore : diagScore * 100;
    }
    return undefined;
  }, [metrics.dataQualityScore, diagnostics?.data_quality]);

  const limitationsMode = useMemo(() => {
    return Boolean(governedReport?.mode === "limitations" || isFallbackReport);
  }, [governedReport?.mode, isFallbackReport]);

  const safeMode = useMemo(
    () =>
      limitationsMode || identitySafeMode === true || isFallbackReport,
    [limitationsMode, identitySafeMode, isFallbackReport]
  );

  const hideActions = useMemo(() => safeMode, [safeMode]);

  const shouldEmitInsights = useMemo(
    () =>
      !isFallbackReport && !limitationsMode && identitySafeMode !== true,
    [limitationsMode, identitySafeMode, isFallbackReport]
  );


  const hasTimeField = useMemo(() => {
    if (syntheticTimeColumn) return true;
    if (identityColumns && Object.keys(identityColumns).length) {
      const entryMatch = Object.entries(identityColumns).some(([name, meta]) =>
        (name ? hasTemporalToken(name) : false) || isTemporalMeta(meta)
      );
      if (entryMatch) return true;
    }
    const schemaColumns = diagnostics?.identity?.schema?.columns;
    if (Array.isArray(schemaColumns)) {
      const match = schemaColumns.some((col: any) => {
        const label = String(col?.name || col?.column || "");
        return hasTemporalToken(label) || isTemporalMeta(col);
      });
      if (match) return true;
    }
    const lower = reportContent.toLowerCase();
    return TIME_TOKENS.some((token) => lower.includes(token));
  }, [syntheticTimeColumn, identityColumns, diagnostics?.identity?.schema?.columns, reportContent]);

  // Sections
  const taskContractSection = useMemo(
    () => sections.find((s) => s.title.toLowerCase().includes("contract")),
    [sections]
  );
  const decisionSection = useMemo(
    () => sections.find((s) => s.title.toLowerCase().includes("decision") || s.title.toLowerCase().includes("purpose")),
    [sections]
  );

  const summarize = (text?: string) => (text ? text.split("\n").slice(0, 4).join("\n").slice(0, 600) : undefined);
  const decisionSummary = useMemo(() => summarize(decisionSection?.content), [decisionSection?.content]);
  const structuredContractSummary = useMemo(() => buildContractSummary(contractSnapshot), [contractSnapshot]);
  const taskContractSummary = useMemo(
    () => structuredContractSummary || summarize(taskContractSection?.content),
    [structuredContractSummary, taskContractSection?.content]
  );
  const primaryQuestion = useMemo(
    () => contractSnapshot?.primary_question || extractPrimaryQuestion(taskContractSection?.content, decisionSection?.content),
    [contractSnapshot?.primary_question, taskContractSection?.content, decisionSection?.content]
  );
  const successCriteria = useMemo(
    () => contractSnapshot?.success_criteria || extractSuccessCriteria(taskContractSection?.content, decisionSection?.content),
    [contractSnapshot?.success_criteria, taskContractSection?.content, decisionSection?.content]
  );
  const outOfScopeDimensions = useMemo(() => {
    const structured = (contractSnapshot?.out_of_scope_dimensions && contractSnapshot.out_of_scope_dimensions.length
      ? contractSnapshot.out_of_scope_dimensions
      : contractSnapshot?.scope_exclusions) || [] as string[];
    if (structured.length) {
      return structured;
    }
    return extractOutOfScope(taskContractSection?.content);
  }, [contractSnapshot?.out_of_scope_dimensions, contractSnapshot?.scope_exclusions, taskContractSection?.content]) || [];

  const scopeLocks = useMemo(() => {
    if (!outOfScopeDimensions?.length) return [];
    return outOfScopeDimensions.map((dimension) => ({
      dimension,
      reason: "Excluded by Task Contract",
    }));
  }, [outOfScopeDimensions]);

  const filteredSections = useMemo(
    () => {
      const basicFilter = sections.filter((s) => {
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
      return filterSuppressedSections(basicFilter);
    },
    [sections, hasTimeField]
  );

  const narrativeAssembly = useMemo(() =>
    assembleNarrative(scoredSections, { heroInsight, primaryQuestion, successCriteria }),
    [scoredSections, heroInsight, primaryQuestion, successCriteria]
  );

  const evidenceSections = useMemo(
    () =>
      filteredSections.filter((s) => {
        const lower = s.content.toLowerCase();
        return lower.includes("evidence") || lower.includes("column") || lower.includes("data");
      }),
    [filteredSections]
  );

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

  const narrativeSummary = useMemo(() => {
    const wins: string[] = keyTakeaways.slice(0, 2);
    const risks: string[] = [];
    if (uncertaintySignals.length) {
      risks.push(...uncertaintySignals.slice(0, 2));
    }
    if (diagnostics?.validation?.failed_fields?.length) {
      risks.push(`Validation gaps: ${diagnostics.validation.failed_fields.slice(0, 3).join(", ")}`);
    }
    const meaning: string[] = [];
    if (safeMode) meaning.push("Some outputs are gated for this run; review diagnostics for details.");
    if (!hasTimeField) meaning.push("Time-based insights are off; add date/time to enable trend views.");
    return {
      wins: wins.length ? wins : ["No standout wins detected."],
      risks: risks.length ? risks : ["No major risks detected."],
      meaning: meaning.length ? meaning : ["Data quality and scope look acceptable for a quick read."],
    };
  }, [keyTakeaways, uncertaintySignals, diagnostics?.validation?.failed_fields, safeMode, confidenceMode, hasTimeField]);

  const runContext = useMemo(() => {
    const mode = diagnostics?.mode || (enhancedAnalytics?.mode as string) || (safeMode ? "safe" : "standard");
    const freshness = enhancedAnalytics?.data_freshness || metrics.dataFreshness || "unknown";
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

  const identityStats = useMemo(
    () => ({
      rows:
        identityPayload?.summary?.row_count ??
        enhancedAnalytics?.quality_metrics?.total_records ??
        metrics.totalRows ??
        "n/a",
      completeness:
        identityPayload?.summary?.quality?.avg_null_pct !== undefined
          ? 1 - Number(identityPayload.summary.quality.avg_null_pct)
          : enhancedAnalytics?.quality_metrics?.overall_completeness,
    }),
    [identityPayload?.summary, enhancedAnalytics?.quality_metrics, metrics.totalRows]
  );

  const profile = useMemo(() => {
    if (!identityColumns) return undefined;
    return { columns: identityColumns, numericColumns: derivedNumericColumns };
  }, [identityColumns, derivedNumericColumns]);

  const governanceWarnings = useMemo(() => {
    return [];
  }, [diagnostics?.reasons, hasTimeField, identitySafeMode, syntheticTimeColumn]);

  const guidanceNotes = useMemo(() => {
    const notes: GuidanceNote[] = [];
    const seen = new Set<string>();

    const register = (message?: string, severity: GuidanceSeverity = "info", source?: string) => {
      if (!message) return;
      const normalized = message.trim();
      if (!normalized) return;
      const key = `${severity}:${source || ""}:${normalized}`;
      if (seen.has(key)) return;
      seen.add(key);
      notes.push({ id: key, message: normalized, severity, source });
    };

    const validationNotes = diagnostics?.validation?.notes;
    if (Array.isArray(validationNotes)) {
      validationNotes.forEach((note) => register(note, "warning", "Validation"));
    }

    const diagReasons = diagnostics?.reasons;
    if (Array.isArray(diagReasons)) {
      diagReasons.forEach((reason) => {
        const lower = reason?.toLowerCase() || "";
        const severity: GuidanceSeverity = lower.includes("safe mode") || lower.includes("prohibited")
          ? "critical"
          : "warning";
        register(reason, severity, "Diagnostics");
      });
    }

    if (!hasTimeField && !syntheticTimeColumn) {
      // register('Time coverage unknown; add a date or time field to unlock trend tools.', "warning", "Timeline");
    }

    if (syntheticTimeColumn) {
      register(`Trend analysis currently uses ${syntheticTimeColumn} as a synthetic timeline.`, "info", "Timeline");
    }

    return notes;
  }, [diagnostics, hasTimeField, syntheticTimeColumn]);

  const highlights = useMemo(() => {
    const chips: { label: string; tone: "default" | "warn" | "ok" }[] = [];
    if (heroInsight?.title) chips.push({ label: `Top insight: ${heroInsight.title}`, tone: "default" });
    if (mondayActions?.[0]) chips.push({ label: `Top action: ${mondayActions[0].title || "Action 1"}`, tone: "default" });
    if (personas?.[0]?.label) chips.push({ label: `Segment: ${personas[0].label}`, tone: "default" });
    if (gatedAnomalies?.count) chips.push({ label: `${gatedAnomalies.count} anomalies`, tone: "warn" });
    if (identityStats.rows && identityStats.rows !== "n/a") {
      chips.push({ label: `Rows: ${identityStats.rows}`, tone: "default" });
    }
    if (chips.length === 0) return [];
    return chips.slice(0, 5);
  }, [heroInsight?.title, mondayActions, personas, gatedAnomalies?.count, identityStats.rows]);

  const runWarnings = useMemo(() => {
    const warnings = Array.isArray(runManifest?.warnings) ? runManifest.warnings : [];
    const deduped = new Map<string, { code: string; message: string; details?: any }>();
    warnings.forEach((warning) => {
      if (!warning || !warning.warning_code) return;
      if (!deduped.has(warning.warning_code)) {
        deduped.set(warning.warning_code, {
          code: warning.warning_code,
          message: warning.message,
          details: warning,
        });
      }
    });
    return Array.from(deduped.values());
  }, [runManifest?.warnings]);

  // Compute View Model
  const viewModel = useMemo(() => {
    const tempResult = {
      metrics,
      dataQualityValue,
      safeMode,
      limitationsMode,
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
    limitationsMode,
    primaryQuestion,
    successCriteria,
    decisionSummary,
    executiveBrief,
    heroInsight,
    evidenceSections,
    sections,
    runId,
  ]);

  // Return with safe defaults for all values via Report Guard
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
    executiveBrief: executiveBrief || { purpose: "", keyFindings: [], confidenceVerdict: "", recommendedAction: "" },
    conclusion: conclusion || { shouldUseFor: [], shouldNotUseFor: [], nextStep: "" },
    heroInsight: heroInsight || { keyInsight: "", impact: "medium" as const, trend: "neutral" as const, confidence: 0, dataQuality: 0, recommendation: "" },
    mondayActions: mondayActions || [],
    segmentComparisonData: segmentComparisonData || [],
    keyTakeaways: keyTakeaways || [],
    dataQualityValue,
    limitationsMode,
    safeMode,
    hideActions,
    shouldEmitInsights,
    hasTimeField,
    taskContractSection,
    decisionSection,
    decisionSummary,
    taskContractSummary,
    filteredSections: filteredSections || [],
    evidenceSections: evidenceSections || [],
    uncertaintySignals: uncertaintySignals || [],
    narrativeSummary: narrativeSummary || { wins: [], risks: [], meaning: [] },
    runContext: runContext || { mode: "standard", freshness: "unknown", scopeLimits: [] },
    identityStats: identityStats || { rows: "n/a", completeness: undefined, confidence: "n/a" },
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
    evidenceMap,
    governedInsights,
  });
}




function normalizeEvidenceMap(raw?: Record<string, any> | null | undefined): Record<string, EvidenceSummary> {
  if (!raw) return {};
  const entries = Object.entries(raw);
  if (!entries.length) return {};

  return entries.reduce<Record<string, EvidenceSummary>>((acc, [evidenceId, record]) => {
    const payload = record || {};
    const evidence = (payload.evidence ?? payload) as Record<string, any>;
    const title = (payload.claim as string) || (evidence.metric as string) || `Evidence ${evidenceId}`;
    const columns = Array.isArray(evidence.source_columns) ? (evidence.source_columns as string[]) : [];
    const method = (evidence.methodology as string) || (payload.method as string);
    const confidence = normalizeEvidenceConfidence((payload.confidence as number) ?? (evidence.confidence as number));

    acc[evidenceId] = {
      id: evidenceId,
      title,
      method,
      columns,
      confidence,
      scope: payload.scope as string | undefined,
      sourceCode: typeof evidence.source_code === 'string' ? (evidence.source_code as string) : undefined,
      dataSource: typeof evidence.data_source === 'string' ? (evidence.data_source as string) : undefined,
      sourceNotes: typeof evidence.source_notes === 'string' ? (evidence.source_notes as string) : undefined,
      raw: payload,
    };
    return acc;
  }, {});
}

function normalizeGovernedInsights(raw?: any[] | null, evidenceMap: Record<string, EvidenceSummary> = {}): GovernedInsightSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((insight, index) => {
    const evidenceId = insight?.evidence_ref || insight?.evidence_id;
    return {
      id: insight?.id || evidenceId || `insight-${index}`,
      claim: insight?.claim,
      agent: insight?.agent,
      severity: insight?.severity,
      metricName: insight?.metric_name || insight?.metric,
      columns: insight?.columns_used || insight?.columns || [],
      confidence: normalizeEvidenceConfidence(insight?.confidence),
      impact: insight?.impact,
      evidenceId,
      evidence: evidenceId ? evidenceMap[evidenceId] : undefined,
    };
  });
}

function normalizeEvidenceConfidence(value?: number) {
  if (typeof value !== 'number') return undefined;
  if (value > 1) return Number(value);
  return Number((value * 100).toFixed(1));
}

