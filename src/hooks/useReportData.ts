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
  
  // External data
  enhancedAnalytics: any;
  analyticsLoading: boolean;
  diagnostics: any;
  modelArtifacts: any;
}

export function useReportData(
  content: string,
  runId: string | undefined,
  confidenceMode: "strict" | "exploratory"
): ReportDataResult {
  const confidenceThreshold = confidenceMode === "strict" ? 90 : 60;

  const { data: enhancedAnalytics, loading: analyticsLoading } = useEnhancedAnalytics(runId);
  const { data: diagnostics } = useDiagnostics(runId);
  const { data: modelArtifacts } = useModelArtifacts(runId);

  // Core extraction
  const metrics = useMemo(() => extractMetrics(content), [content]);
  const progressMetrics = useMemo(() => extractProgressMetrics(content), [content]);
  const sections = useMemo(() => extractSections(content), [content]);
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
  const executiveBrief = useMemo(() => extractExecutiveBrief(content), [content]);
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
    if (typeof metrics.confidenceLevel === "number") return metrics.confidenceLevel;
    if (Number.isFinite(Number(metrics.confidenceLevel))) return Number(metrics.confidenceLevel);
    return undefined;
  }, [metrics.confidenceLevel]);

  const dataQualityValue = useMemo(() => {
    if (typeof metrics.dataQualityScore === "number") return metrics.dataQualityScore;
    if (Number.isFinite(Number(metrics.dataQualityScore))) return Number(metrics.dataQualityScore);
    return undefined;
  }, [metrics.dataQualityScore]);

  const limitationsMode = useMemo(() => {
    const lower = content.toLowerCase();
    const signals = [
      "mode: limitations",
      "insights suppressed",
      "suppressed due to confidence",
      "suppressed due to contract",
      "suppressed due to validation",
    ];
    const hasSignal = signals.some((sig) => lower.includes(sig));
    const lowConfidence = typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel <= 5;
    return hasSignal || lowConfidence;
  }, [content, metrics.confidenceLevel]);

  const safeMode = useMemo(
    () =>
      limitationsMode ||
      (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold),
    [limitationsMode, metrics.confidenceLevel, confidenceThreshold]
  );

  const hideActions = useMemo(
    () => safeMode || (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold),
    [safeMode, metrics.confidenceLevel, confidenceThreshold]
  );

  const shouldEmitInsights = useMemo(
    () => !limitationsMode && (typeof metrics.confidenceLevel !== "number" || metrics.confidenceLevel >= confidenceThreshold),
    [limitationsMode, metrics.confidenceLevel, confidenceThreshold]
  );

  const hasTimeField = useMemo(() => {
    const lower = content.toLowerCase();
    return lower.includes("date") || lower.includes("time");
  }, [content]);

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
  const taskContractSummary = useMemo(() => summarize(taskContractSection?.content), [taskContractSection?.content]);

  const filteredSections = useMemo(
    () =>
      sections.filter((s) => {
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
      }),
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
      rows: enhancedAnalytics?.quality_metrics?.total_records ?? metrics.totalRows ?? "n/a",
      completeness: enhancedAnalytics?.quality_metrics?.overall_completeness,
      confidence: diagnostics?.confidence?.data_confidence ?? metrics.confidenceLevel ?? "n/a",
    }),
    [enhancedAnalytics?.quality_metrics, diagnostics?.confidence, metrics.totalRows, metrics.confidenceLevel]
  );

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

  // Return with safe defaults for all values
  return {
    metrics: metrics || {},
    progressMetrics: progressMetrics || {},
    sections: sections || [],
    segmentData: segmentData || [],
    compositionData: compositionData || [],
    measurableSegments: measurableSegments || [],
    clusterMetrics,
    personas: personas || [],
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
    enhancedAnalytics,
    analyticsLoading,
    diagnostics,
    modelArtifacts,
  };
}
