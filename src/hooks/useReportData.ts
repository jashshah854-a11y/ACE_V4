import { useMemo } from "react";
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
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useModelArtifacts } from "@/hooks/useModelArtifacts";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import type { GovernedReport, TaskContractSnapshot } from "@/hooks/useGovernedReport";
import { transformAPIResponse, ReportViewModel, filterSuppressedSections } from "@/lib/reportViewModel";
import { ensureSafeReport } from "@/lib/ReportGuard";

export interface ReportDataResult {
  // Core extracted data
  metrics: ReturnType<typeof extractMetrics>;
  progressMetrics: ReturnType<typeof extractProgressMetrics>;
  sections: ReturnType<typeof extractSections>;
  segmentData: any;
  compositionData: any;
  measurableSegments: any[];
  clusterMetrics: ReturnType<typeof parseClusterMetrics>;
  personas: ReturnType<typeof extractPersonas>;
  outcomeModel: ReturnType<typeof extractOutcomeModel>;
  anomalies: ReturnType<typeof extractAnomalies>;

  // Narrative components
  executiveBrief: ReturnType<typeof extractExecutiveBrief>;
  conclusion: ReturnType<typeof extractConclusion>;
  heroInsight: ReturnType<typeof extractHeroInsight>;
  mondayActions: ReturnType<typeof generateMondayActions>;
  segmentComparisonData: ReturnType<typeof extractSegmentData>;
  keyTakeaways: string[];

  // Computed values
  confidenceValue: number | undefined;
  dataQualityValue: number | undefined;
  limitationsMode: boolean;
  safeMode: boolean;
  hideActions: boolean;
  shouldEmitInsights: boolean;
  hasTimeField: boolean;

  // Sections
  taskContractSection: any;
  decisionSection: any;
  decisionSummary: string | undefined;
  taskContractSummary: string | undefined;
  filteredSections: any[];
  evidenceSections: any[];
  uncertaintySignals: string[];
  narrativeSummary: { wins: string[]; risks: string[]; meaning: string[] };
  runContext: { mode: string; freshness: string; scopeLimits: string[] };
  identityStats: { rows: any; completeness: any; confidence: any };
  highlights: { label: string; tone: "default" | "warn" | "ok" }[];
  primaryQuestion?: string;
  outOfScopeDimensions: string[];
  scoredSections: Array<ReturnType<typeof extractSections>[number] & { importance: number }>;
  profile?: { columns: Record<string, any>; numericColumns: string[] };

  // External data
  enhancedAnalytics: any;
  analyticsLoading: boolean;
  diagnostics: any;
  modelArtifacts: any;
  viewModel: ReportViewModel;
}

const MIN_IMPORTANCE = 0.05;
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

function normalizeConfidence(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value <= 1 ? value * 100 : value;
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
  const governedConfidence = normalizeConfidence(governedReport?.confidence?.data_confidence);
  const contractConfidenceThreshold = normalizeConfidence(contractSnapshot?.confidence_threshold);
  const confidenceThreshold = contractConfidenceThreshold ?? (confidenceMode === "strict" ? 90 : 60);

  const { data: enhancedAnalytics, loading: analyticsLoading } = useEnhancedAnalytics(runId);
  const { data: diagnostics } = useDiagnostics(runId);
  const { data: modelArtifacts } = useModelArtifacts(runId);
  const { data: identityPayload } = useRemoteArtifact<IdentityApiResponse>(runId, "identity");

  const identityCard = identityPayload?.identity || diagnostics?.identity || null;
  const identitySafeMode = identityPayload?.summary?.is_safe_mode ?? identityCard?.is_safe_mode;

  const identityColumns = useMemo(() => {
    if (identityPayload?.profile?.columns) {
      return identityPayload.profile.columns;
    }
    const rawColumns =
      diagnostics?.identity?.columns ||
      diagnostics?.identity?.schema?.columns ||
      enhancedAnalytics?.quality_metrics?.columns ||
      null;
    return normalizeColumnMap(rawColumns);
  }, [identityPayload?.profile?.columns, diagnostics?.identity, enhancedAnalytics?.quality_metrics]);

  const derivedNumericColumns = useMemo(() => {
    if (identityPayload?.profile?.numericColumns?.length) {
      return identityPayload.profile.numericColumns as string[];
    }
    if (!identityColumns) return [] as string[];
    return Object.entries(identityColumns)
      .filter(([, col]) => isNumericColumn(col))
      .map(([name]) => name);
  }, [identityPayload?.profile?.numericColumns, identityColumns]);

  // DETECT FALLBACK / ERROR REPORT
  const isFallbackReport = useMemo(() => {
    const lower = content.toLowerCase();
    return (
      lower.includes("system notice") ||
      lower.includes("analysis failed") ||
      lower.includes("analysis report (partially_complete)") ||
      // Detect the hard fallback header from server.py
      (lower.includes("# analysis report") && lower.includes("diagnostics"))
    );
  }, [content]);

  // Core extraction
  const metrics = useMemo(() => extractMetrics(content), [content]);
  const progressMetrics = useMemo(() => extractProgressMetrics(content), [content]);
  const sections = useMemo(() => extractSections(content), [content]);
  const scoredSections = useMemo(
    () => sections.map((section, index) => ({ ...section, importance: parseImportanceFromContent(section.content, index) })),
    [sections]
  );
  const { segmentData, compositionData } = useMemo(() => extractChartData(content), [content]);

  const measurableSegments = useMemo(
    () =>
      (segmentData || []).map((seg: any) => ({
        ...seg,
        label: seg?.label ? `${seg.label}` : "Segment",
        subtitle: seg?.avgValue ? `avg=${Math.round(seg.avgValue)}` : undefined,
      })),
    [segmentData]
  );

  const clusterMetrics = useMemo(() => parseClusterMetrics(content), [content]);
  const personas = useMemo(() => extractPersonas(content), [content]);
  const outcomeModel = useMemo(() => extractOutcomeModel(content), [content]);
  const anomalies = useMemo(() => extractAnomalies(content), [content]);

  // Narrative components
  const executiveBrief = useMemo(() => {
    if (isFallbackReport) {
      // Manual extraction for fallback reports
      const lines = content.split('\n').filter(l => l.trim().length > 0);
      const purpose = lines.find(l => l.toLowerCase().includes("notice")) || "The system encountered an error during analysis.";
      const status = lines.find(l => l.toLowerCase().includes("status:")) || "Status: Incomplete";
      return {
        purpose: purpose.replace(/^[>#\-\s*]+/, "").trim(),
        keyFindings: [status.replace(/^[>#\-\s*]+/, "").trim()],
        confidenceVerdict: "Low (Fallback)",
        recommendedAction: "Please review the diagnostics section or retry the analysis."
      };
    }
    return extractExecutiveBrief(content);
  }, [content, isFallbackReport]);

  const conclusion = useMemo(() => extractConclusion(content), [content]);
  const heroInsight = useMemo(() => extractHeroInsight(content, metrics), [content, metrics]);
  const mondayActions = useMemo(() => generateMondayActions(content, metrics, anomalies), [content, metrics, anomalies]);
  const segmentComparisonData = useMemo(() => extractSegmentData(content), [content]);

  const keyTakeaways = useMemo(
    () =>
      content
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("*"))
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 20 && line.length < 150)
        .slice(0, 5),
    [content]
  );

  // Computed values
  const confidenceValue = useMemo(() => {
    if (governedConfidence !== undefined) return governedConfidence;
    if (typeof metrics.confidenceLevel === "number") return Number(metrics.confidenceLevel);
    if (Number.isFinite(Number(metrics.confidenceLevel))) return Number(metrics.confidenceLevel);
    const diagConfidence = diagnostics?.confidence?.data_confidence;
    if (typeof diagConfidence === "number") {
      return diagConfidence > 1 ? diagConfidence : diagConfidence * 100;
    }
    return undefined;
  }, [governedConfidence, metrics.confidenceLevel, diagnostics?.confidence?.data_confidence]);

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
    if (governedReport?.mode === "limitations") return true;
    const lower = content.toLowerCase();
    const signals = [
      "mode: limitations",
      "insights suppressed",
      "suppressed due to confidence",
      "suppressed due to contract",
      "suppressed due to validation",
    ];
    const hasSignal = signals.some((sig) => lower.includes(sig));
    const metricLowConfidence = typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel <= 5;
    const governedLowConfidence = typeof governedConfidence === "number" && governedConfidence < confidenceThreshold;
    return hasSignal || metricLowConfidence || governedLowConfidence || isFallbackReport;
  }, [content, metrics.confidenceLevel, governedReport?.mode, governedConfidence, confidenceThreshold, isFallbackReport]);

  const safeMode = useMemo(
    () =>
      limitationsMode ||
      (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold) ||
      identitySafeMode === true ||
      isFallbackReport,
    [limitationsMode, metrics.confidenceLevel, confidenceThreshold, identitySafeMode, isFallbackReport]
  );

  const hideActions = useMemo(
    () => safeMode || (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold),
    [safeMode, metrics.confidenceLevel, confidenceThreshold]
  );

  const shouldEmitInsights = useMemo(
    () => !isFallbackReport && !limitationsMode && (typeof metrics.confidenceLevel !== "number" || metrics.confidenceLevel >= confidenceThreshold),
    [limitationsMode, metrics.confidenceLevel, confidenceThreshold, isFallbackReport]
  );

  const hasTimeField = useMemo(() => {
    if (identityColumns) {
      const names = Object.keys(identityColumns);
      if (names.some((name) => name.toLowerCase().includes("date") || name.toLowerCase().includes("time"))) {
        return true;
      }
    }
    const schemaColumns = diagnostics?.identity?.schema?.columns;
    if (Array.isArray(schemaColumns)) {
      const match = schemaColumns.some((col: any) => {
        const name = String(col?.name || col?.column || "").toLowerCase();
        return name.includes("date") || name.includes("time");
      });
      if (match) return true;
    }
    const lower = content.toLowerCase();
    return lower.includes("date") || lower.includes("time");
  }, [identityColumns, diagnostics?.identity?.schema?.columns, content]);

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
  const outOfScopeDimensions = useMemo(() => {
    const structured = (contractSnapshot?.out_of_scope_dimensions && contractSnapshot.out_of_scope_dimensions.length
      ? contractSnapshot.out_of_scope_dimensions
      : contractSnapshot?.scope_exclusions) || [] as string[];
    if (structured.length) {
      return structured;
    }
    return extractOutOfScope(taskContractSection?.content);
  }, [contractSnapshot?.out_of_scope_dimensions, contractSnapshot?.scope_exclusions, taskContractSection?.content]) || [];

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

  const evidenceSections = useMemo(
    () =>
      filteredSections.filter((s) => {
        const lower = s.content.toLowerCase();
        return lower.includes("evidence") || lower.includes("column") || lower.includes("data");
      }),
    [filteredSections]
  );

  const uncertaintySignals = useMemo(() => {
    const lower = content.toLowerCase();
    const signals: string[] = [];
    if (limitationsMode) {
      signals.push("Insights suppressed by confidence/contract/validation gates.");
    }
    if (typeof metrics.confidenceLevel === "number") {
      signals.push(`Confidence: ${metrics.confidenceLevel}%`);
    }
    if (lower.includes("conflict")) {
      signals.push("Report text mentions conflicts across datasets or models.");
    }
    return signals;
  }, [content, limitationsMode, metrics.confidenceLevel]);

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
    if (safeMode) meaning.push("Safe Mode limits ranking/strategies; use exploratory toggle for a preview.");
    if (confidenceValue !== undefined) meaning.push(`Confidence sits at ${confidenceValue}% (${confidenceMode}).`);
    if (!hasTimeField) meaning.push("Time-based insights are off; add date/time to enable trend views.");
    return {
      wins: wins.length ? wins : ["No high-confidence wins detected."],
      risks: risks.length ? risks : ["No major risks detected."],
      meaning: meaning.length ? meaning : ["Data quality and scope look acceptable for a quick read."],
    };
  }, [keyTakeaways, uncertaintySignals, diagnostics?.validation?.failed_fields, safeMode, confidenceValue, confidenceMode, hasTimeField]);

  const runContext = useMemo(() => {
    const mode = diagnostics?.mode || (enhancedAnalytics?.mode as string) || (safeMode ? "safe" : "standard");
    const freshness = enhancedAnalytics?.data_freshness || metrics.dataFreshness || "unknown";
    const scopeLimits: string[] = [];
    if (!hasTimeField) scopeLimits.push("No time field");
    if (limitationsMode) scopeLimits.push("Limitations mode");
    return {
      mode,
      freshness,
      scopeLimits: scopeLimits.length ? scopeLimits : ["None flagged"],
    };
  }, [diagnostics?.mode, enhancedAnalytics?.mode, enhancedAnalytics?.data_freshness, metrics.dataFreshness, safeMode, hasTimeField, limitationsMode]);

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
      confidence: diagnostics?.confidence?.data_confidence ?? metrics.confidenceLevel ?? "n/a",
    }),
    [identityPayload?.summary, enhancedAnalytics?.quality_metrics, diagnostics?.confidence, metrics.totalRows, metrics.confidenceLevel]
  );

  const profile = useMemo(() => {
    if (!identityColumns) return undefined;
    return { columns: identityColumns, numericColumns: derivedNumericColumns };
  }, [identityColumns, derivedNumericColumns]);

  const highlights = useMemo(() => {
    const chips: { label: string; tone: "default" | "warn" | "ok" }[] = [];
    if (heroInsight?.title) chips.push({ label: `Top insight: ${heroInsight.title}`, tone: "default" });
    if (mondayActions?.[0]) chips.push({ label: `Top action: ${mondayActions[0].title || "Action 1"}`, tone: "default" });
    if (personas?.[0]?.label) chips.push({ label: `Segment: ${personas[0].label}`, tone: "default" });
    if (anomalies?.count) chips.push({ label: `${anomalies.count} anomalies`, tone: "warn" });
    if (confidenceValue !== undefined) {
      const tone = confidenceValue >= confidenceThreshold ? "ok" : "warn";
      chips.push({ label: `Confidence ${confidenceValue}%`, tone });
    }
    if (identityStats.rows && identityStats.rows !== "n/a") {
      chips.push({ label: `Rows: ${identityStats.rows}`, tone: "default" });
    }
    if (safeMode) chips.push({ label: "Safe Mode active", tone: "warn" });
    if (chips.length === 0) chips.push({ label: "No highlights available", tone: "default" });
    return chips.slice(0, 5);
  }, [heroInsight?.title, mondayActions, personas, anomalies?.count, confidenceValue, confidenceThreshold, safeMode, identityStats.rows]);

  // Compute View Model
  const viewModel = useMemo(() => {
    const tempResult = {
      metrics,
      confidenceValue,
      dataQualityValue,
      safeMode,
      limitationsMode,
      primaryQuestion,
      decisionSummary,
      executiveBrief,
      heroInsight,
      runId,
      evidenceSections: evidenceSections || [],
      sections,
    };
    return transformAPIResponse(tempResult);
  }, [
    metrics,
    confidenceValue,
    dataQualityValue,
    safeMode,
    limitationsMode,
    primaryQuestion,
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
    outcomeModel,
    anomalies: anomalies || { count: 0, drivers: [] },
    executiveBrief: executiveBrief || { purpose: "", keyFindings: [], confidenceVerdict: "", recommendedAction: "" },
    conclusion: conclusion || { shouldUseFor: [], shouldNotUseFor: [], nextStep: "" },
    heroInsight: heroInsight || { keyInsight: "", impact: "medium" as const, trend: "neutral" as const, confidence: 0, dataQuality: 0, recommendation: "" },
    mondayActions: mondayActions || [],
    segmentComparisonData: segmentComparisonData || [],
    keyTakeaways: keyTakeaways || [],
    confidenceValue,
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
    outOfScopeDimensions,
    scoredSections,
    enhancedAnalytics,
    analyticsLoading,
    diagnostics,
    modelArtifacts,
    viewModel,
    profile,
  });
}


