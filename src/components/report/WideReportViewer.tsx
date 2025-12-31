import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGuidance } from "@/lib/getGuidance";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useReportData } from "@/hooks/useReportData";
import { useEvidenceRegistry } from "@/hooks/useEvidenceRegistry";
import { copyToClipboard, downloadMarkdown } from "./PDFExporter";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { ReportSkeleton } from "./ReportSkeleton";
import { InsightCanvasLayout } from "./InsightCanvasLayout";
import { NavigationRail } from "./NavigationRail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { TraceableText } from "./TraceableText";
import { useTaskContext } from "@/context/TaskContext";
import { LimitationBanner } from "./LimitationBanner";
import { ScopeLockModal } from "./ScopeLockModal";
import { API_BASE } from "@/lib/api-client";
import { SplitReportViewer } from "./simulation/SplitReportViewer";
import { SimulationControls } from "./simulation/SimulationControls";
import { useSimulation } from "@/context/SimulationContext";
import { GuidanceModal } from "./GuidanceModal";
import { ExecutiveBrief } from "./ExecutiveBrief";
import { ExecutiveHero } from "./ExecutiveHero"; // [NEW] visual update
import { useSmoothScroll, formatBriefText } from "@/hooks/useSmoothScroll";
import { TechnicalSection } from "@/components/report/technical/TechnicalSection";
import { KeyPerformanceIndicators } from "./KeyPerformanceIndicators"; // [NEW] visual update
import { AskAce } from "./story/AskAce";

// Refactored viewer components
import {
  ReportHero,
  ReportToolbar,
  SafeModeBanner,
  DiagnosticsCard,
  ReportMetricsStrip,
  IdentityTrustStrip,
  HighlightsRibbon,
  ReportEvidenceInspector,
  ReportActionsPanel,
  ReportPersonasPanel,
  ReportInsightStoryboard,
} from "./viewer";

import { GlobalAlert } from "./GlobalAlert";
import { SignalStrength } from "./SignalStrength";
import { WhyExplainer } from "./WhyExplainer";

// Validation component
import { ReportDataValidator } from "./ReportDataValidator";

// Existing components
import { HeroInsightPanel } from "./HeroInsightPanel";
import { MondayMorningActions } from "./MondayMorningActions";
import { SECTION_ICONS, ReportAccordion } from "./ReportAccordion";
import { PersonaSection } from "./PersonaSection";
import { OutcomeModelSection } from "./OutcomeModelSection";
import { AnomalyBanner } from "./AnomalyBanner";
import { SegmentOverviewTable } from "./SegmentOverviewTable";
import { SegmentComparison } from "./SegmentComparison";
import { MetricGrid, interpretSilhouetteScore, interpretR2Score, interpretDataQuality } from "./MetricInterpretation";
import { BusinessIntelligenceDashboard } from "./BusinessIntelligenceDashboard";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { DistributionCharts } from "./DistributionCharts";
import { ClusterGaugeSection } from "./ClusterGaugeSection";
import { ReportCharts } from "./ReportCharts";
import { TechnicalDetailsSection } from "./TechnicalDetailsSection";
import { ReportConclusion } from "./ReportConclusion";
import { TableOfContents } from "./TableOfContents";
import { IntelligenceRail } from "./IntelligenceRail";
import { EvidencePanel } from "./EvidencePanel";
import { QueryRail } from "./query/QueryRail";
import { DataInterrogator } from "./query/DataInterrogator";

interface WideReportViewerProps {
  content?: string;
  className?: string;
  isLoading?: boolean;
  runId?: string;
}

export function WideReportViewer({ content, className, isLoading, runId }: WideReportViewerProps) {
  // UI State
  const [copied, setCopied] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState("");
  const [confidenceMode, setConfidenceMode] = useState<"strict" | "exploratory">("exploratory");
  const [showAllActions, setShowAllActions] = useState(false);
  const [showAllPersonas, setShowAllPersonas] = useState(false);

  // Evidence state
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const isRightRailOpen = Boolean(activeEvidenceId); // Derived state for now
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [evidenceSample, setEvidenceSample] = useState<any[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Diff state
  const [diffRunId, setDiffRunId] = useState("");
  const [diffData, setDiffData] = useState<any | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  // PPTX state
  const [pptxLoading, setPptxLoading] = useState(false);
  const [pptxError, setPptxError] = useState<string | null>(null);

  // Guidance Modal state
  const [isGuidanceModalOpen, setIsGuidanceModalOpen] = useState(false);

  // Smooth scroll hook
  const { scrollToSection } = useSmoothScroll();

  const { toast } = useToast();
  const { updateTaskContract } = useTaskContext();
  const { data: governedReport } = useGovernedReport(runId);
  const { simulationState } = useSimulation();

  // Use refactored data hook
  const reportData = useReportData(content || "", runId, confidenceMode, governedReport);
  const { data: evidenceRegistry } = useEvidenceRegistry(runId);
  const confidenceThreshold = confidenceMode === "strict" ? 90 : 60;
  const [scopeLockDimension, setScopeLockDimension] = useState<string | null>(null);
  const outOfScopeLookup = useMemo(
    () => reportData.outOfScopeDimensions.map((item) => item.toLowerCase()),
    [reportData.outOfScopeDimensions]
  );
  useEffect(() => {
    updateTaskContract({
      primaryQuestion: reportData.primaryQuestion,
      outOfScopeDimensions: reportData.outOfScopeDimensions,
    });
  }, [reportData.primaryQuestion, reportData.outOfScopeDimensions, updateTaskContract]);

  // Track reading progress
  // Track reading progress and active section via IntersectionObserver
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener("scroll", handleScroll);

    // Intersection Observer for Active Section
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Active when near top of viewport
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCurrentSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all possible section IDs from navigation items
    const navItemIds = reportData.sections?.map(item => item.id) || [];
    // Also include hardcoded sections
    const allSectionIds = [...navItemIds, "executive-summary", "visualizations", "segments", "full-report"];

    allSectionIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [reportData.sections]);

  // Early returns
  if (isLoading) {
    return <ReportSkeleton />;
  }

  if (!content || content.trim().length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        No report content available.
      </div>
    );
  }

  // Compute safe mode reasons
  const safeModeReasons = useMemo(() => {
    const reasons: string[] = [];
    if (reportData.diagnostics?.reasons?.length) reasons.push(...reportData.diagnostics.reasons);
    if (reportData.limitationsMode) reasons.push("Validation/contract gates active (limitations mode).");
    if (typeof reportData.metrics.confidenceLevel === "number" && reportData.metrics.confidenceLevel < confidenceThreshold) {
      reasons.push(`Confidence ${reportData.metrics.confidenceLevel}% below threshold ${confidenceThreshold}%.`);
    }
    if (!reportData.hasTimeField) reasons.push("Time fields not detected; time-series suppressed.");
    if (reportData.evidenceSections.length === 0) reasons.push("No evidence-bearing sections detected.");
    return Array.from(new Set(reasons));
  }, [reportData.diagnostics?.reasons, reportData.limitationsMode, reportData.metrics.confidenceLevel, confidenceThreshold, reportData.hasTimeField, reportData.evidenceSections.length]);

  const limitationFootnote = useMemo(() => {
    if (!reportData.hasTimeField) return "Time analysis suppressed: no date/time fields detected.";
    return null;
  }, [reportData.hasTimeField]);
  const missingIdentityFields = reportData.diagnostics?.identity?.missing_fields as string[] | undefined;

  const getSectionLimitations = useCallback((section: { title: string; content: string }) => {
    const notes: string[] = [];
    const lowerTitle = section.title.toLowerCase();
    const lowerContent = section.content.toLowerCase();
    if (reportData.safeMode) notes.push("Safe Mode: insights constrained");
    if (reportData.limitationsMode) notes.push("Limitations mode active");
    if (!reportData.hasTimeField && (lowerTitle.includes("time") || lowerContent.includes("forecast"))) {
      notes.push("Time/forecast suppressed (no date/time field)");
    }
    if (reportData.diagnostics?.validation?.failed_fields?.length) {
      notes.push(`Validation gaps: ${reportData.diagnostics.validation.failed_fields.slice(0, 3).join(", ")}`);
    }
    if (reportData.diagnostics?.identity?.missing_fields?.length) {
      notes.push(`Missing fields: ${reportData.diagnostics.identity.missing_fields.slice(0, 3).join(", ")}`);
    }
    return Array.from(new Set(notes));
  }, [reportData.safeMode, reportData.limitationsMode, reportData.hasTimeField, reportData.diagnostics]);

  // Handlers
  const handleCopy = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopied(true);
      toast({ title: "✅ Copied to clipboard!", description: "Report content ready to paste" });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: "❌ Failed to copy", description: "Please try again", variant: "destructive" });
    }
  };

  const handleDownloadMarkdown = () => {
    const filename = runId ? `ace-report-${runId}.md` : "ace-report.md";
    downloadMarkdown(content, filename);
    toast({ title: "⬇️ Markdown downloaded", description: filename });
  };

  const handleSectionClick = (sectionId: string) => {
    setCurrentSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleRunDiff = async () => {
    if (!runId || !diffRunId) {
      setDiffError("Provide both current run and comparison run ID.");
      return;
    }
    setDiffLoading(true);
    setDiffError(null);
    setDiffData(null);
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/diff/${diffRunId}`);
      if (!res.ok) throw new Error(`Diff failed: ${res.statusText}`);
      const json = await res.json();
      setDiffData(json);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : "Unknown diff error");
    } finally {
      setDiffLoading(false);
    }
  };

  const handlePptxExport = async () => {
    if (!runId) {
      setPptxError("Run ID missing");
      return;
    }
    setPptxLoading(true);
    setPptxError(null);
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/pptx`);
      if (!res.ok) throw new Error(`PPTX export failed: ${res.statusText}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = runId ? `ace-report-${runId}.pptx` : "ace-report.pptx";
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "PPTX export ready", description: a.download });
    } catch (err) {
      setPptxError(err instanceof Error ? err.message : "Unknown PPTX error");
    } finally {
      setPptxLoading(false);
    }
  };

  const handleFetchEvidenceSample = async ({
    contentSnippet,
    evidenceId,
    sectionTitle,
  }: {
    contentSnippet: string;
    evidenceId?: string;
    sectionTitle?: string;
  }) => {
    if (sectionTitle) {
      const blocked = outOfScopeLookup.some((item) => item && sectionTitle.toLowerCase().includes(item));
      if (blocked) {
        setScopeLockDimension(sectionTitle);
        return;
      }
    }
    if (!runId) {
      setEvidenceError("Run ID not available");
      return;
    }
    setEvidencePreview(contentSnippet);
    if (evidenceId) setActiveEvidenceId(evidenceId);
    setEvidenceLoading(true);
    setEvidenceError(null);
    setEvidenceSample(null);
    try {
      const qs = new URLSearchParams({ rows: "5", ...(evidenceId ? { evidence_id: evidenceId } : {}) });
      const res = await fetch(`${API_BASE}/runs/${runId}/evidence/sample?${qs.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch evidence sample: ${res.statusText}`);
      const json = await res.json();
      setEvidenceSample(json.rows || []);
    } catch (err) {
      setEvidenceError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleCloseEvidence = () => {
    setActiveEvidenceId(null);
    setEvidencePreview(null);
    setEvidenceSample(null);
    setEvidenceError(null);
  };

  // Build accordion sections
  const accordionSections = [
    ...(reportData.limitationsMode
      ? [
        {
          id: "limitations",
          title: "Insights Suppressed",
          icon: SECTION_ICONS.anomalies,
          defaultOpen: true,
          content: (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30">
              Insights are in limitations mode due to confidence/contract/validation gates.
            </div>
          ),
        },
      ]
      : []),

    ...(reportData.uncertaintySignals.length > 0
      ? [
        {
          id: "uncertainty",
          title: "Uncertainty & Conflicts",
          icon: SECTION_ICONS.anomalies,
          defaultOpen: true,
          content: (
            <ul className="list-disc pl-5 text-sm space-y-2 text-foreground">
              {reportData.uncertaintySignals.map((sig, idx) => (
                <li key={idx}>{sig}</li>
              ))}
            </ul>
          ),
        },
      ]
      : []),

    ...(reportData.anomalies && reportData.anomalies.count > 0
      ? [
        {
          id: "anomalies-alert",
          title: `⚠️ ${reportData.anomalies.count} Anomalies Detected`,
          icon: SECTION_ICONS.anomalies,
          defaultOpen: true,
          content: (
            <AnomalyBanner
              count={reportData.anomalies.count}
              totalRecords={reportData.metrics.recordsProcessed}
              topDrivers={reportData.anomalies.drivers?.map((d) => `${d.field}: ${Math.round(d.score * 100)}%`) || []}
            />
          ),
        },
      ]
      : []),

    ...(reportData.shouldEmitInsights && reportData.measurableSegments.length > 0
      ? [
        {
          id: "segments",
          title: "Customer Segments & Actions",
          icon: SECTION_ICONS.summary,
          defaultOpen: true,
          content: (
            <div className="space-y-8">
              <SegmentOverviewTable segments={reportData.measurableSegments} totalCustomers={reportData.metrics.recordsProcessed || 10000} />
              <SegmentComparison segments={reportData.measurableSegments} totalCustomers={reportData.metrics.recordsProcessed || 10000} />
              <div className="grid gap-3 sm:grid-cols-2">
                {reportData.measurableSegments.map((seg, idx) => (
                  <Card key={idx} className="p-3">
                    <div className="text-sm font-semibold">Segment {idx + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {seg.subtitle || "Data-driven segment"}
                      {seg.mean && ` • mean=${Math.round(seg.mean)}`}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ),
        },
      ]
      : []),

    {
      id: "visualizations",
      title: "Data Visualizations",
      icon: SECTION_ICONS.quality,
      defaultOpen: true,
      content: (
        <div className="space-y-8">
          <MetricGrid
            metrics={[
              {
                name: "Data Quality Score",
                value: `${reportData.metrics.dataQualityScore || 0}%`,
                interpretation: interpretDataQuality(reportData.metrics.dataQualityScore || 0),
                benchmark: "Target: 85%+ for reliable insights",
                confidenceLevel: (reportData.metrics.dataQualityScore || 0) >= 85 ? "high" : (reportData.metrics.dataQualityScore || 0) >= 70 ? "medium" : "low",
                helpText: "Measures completeness, consistency, and accuracy of your dataset",
              },
              ...(reportData.shouldEmitInsights && reportData.clusterMetrics?.silhouetteScore
                ? [
                  {
                    name: "Clustering Quality (Silhouette Score)",
                    value: reportData.clusterMetrics.silhouetteScore.toFixed(2),
                    interpretation: interpretSilhouetteScore(reportData.clusterMetrics.silhouetteScore),
                    benchmark: "Good: 0.51-0.70, Excellent: 0.71+",
                    confidenceLevel: reportData.clusterMetrics.silhouetteScore >= 0.51 ? ("high" as const) : ("medium" as const),
                    helpText: "Indicates how well-separated your customer segments are",
                  },
                ]
                : []),
              ...(reportData.shouldEmitInsights && reportData.outcomeModel?.r2Score !== undefined
                ? [
                  {
                    name: "Model Fit (R² Score)",
                    value: reportData.outcomeModel.r2Score.toFixed(3),
                    interpretation: interpretR2Score(reportData.outcomeModel.r2Score),
                    benchmark: "Good: 0.50-0.89, Excellent: 0.90+",
                    confidenceLevel: reportData.outcomeModel.r2Score >= 0.5 ? ("high" as const) : reportData.outcomeModel.r2Score >= 0 ? ("medium" as const) : ("low" as const),
                    helpText: "Shows how well the model explains variance in your target outcome",
                  },
                ]
                : []),
            ]}
          />

          {reportData.shouldEmitInsights && reportData.enhancedAnalytics?.business_intelligence?.available && (
            <DataInterrogator
              dataPointId="bi_dashboard"
              label="Business Intelligence"
              type="general"
            >
              <BusinessIntelligenceDashboard
                valueMetrics={reportData.enhancedAnalytics.business_intelligence.value_metrics}
                clvProxy={reportData.enhancedAnalytics.business_intelligence.clv_proxy}
                segmentValue={reportData.enhancedAnalytics.business_intelligence.segment_value}
                churnRisk={reportData.enhancedAnalytics.business_intelligence.churn_risk}
                insights={reportData.enhancedAnalytics.business_intelligence.insights}
                evidence={reportData.enhancedAnalytics.business_intelligence.evidence}
              />
            </DataInterrogator>
          )}

          {(reportData.enhancedAnalytics?.feature_importance?.feature_importance || reportData.modelArtifacts?.feature_importance) && (
            <Card className="p-4 border-l-4 border-l-primary/50">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm">Top Key Drivers</div>
                <Badge variant="outline" className="text-[10px] font-normal">Impact Factors</Badge>
              </div>
              <div className="space-y-3">
                {(() => {
                  const rawData = reportData.enhancedAnalytics?.feature_importance?.feature_importance || reportData.modelArtifacts?.feature_importance || [];
                  const items = Array.isArray(rawData) ? rawData : Object.entries(rawData).map(([k, v]) => {
                    let val = v;
                    if (typeof v === 'object' && v !== null && 'importance' in v) {
                      val = (v as any).importance;
                    }
                    return { feature: k, importance: val };
                  });

                  // Sort by importance descending
                  const sortedItems = items.sort((a: any, b: any) => {
                    const valA = typeof a.importance === 'number' ? a.importance : 0;
                    const valB = typeof b.importance === 'number' ? b.importance : 0;
                    return valB - valA;
                  }).slice(0, 5);

                  const maxVal = Math.max(...sortedItems.map((i: any) => typeof i.importance === 'number' ? i.importance : 0), 1);

                  return sortedItems.map((f: any, i: number) => {
                    const val = typeof (f.importance || f[1]) === 'number' ? (f.importance || f[1]) : 0;
                    const percent = Math.min((val / maxVal) * 100, 100);

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium truncate max-w-[70%]">{f.feature || f[0]}</span>
                          <span className="text-muted-foreground font-mono">{val.toFixed(3)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  });
                })()}
              </div>
            </Card>
          )}

          {reportData.shouldEmitInsights &&
            reportData.enhancedAnalytics?.correlation_analysis?.available &&
            reportData.enhancedAnalytics.correlation_analysis.strong_correlations && (
              <CorrelationHeatmap
                correlations={reportData.enhancedAnalytics.correlation_analysis.strong_correlations}
                insights={reportData.enhancedAnalytics.correlation_analysis.insights}
              />
            )}

          {reportData.shouldEmitInsights &&
            reportData.enhancedAnalytics?.distribution_analysis?.available &&
            reportData.enhancedAnalytics.distribution_analysis.distributions && (
              <DistributionCharts
                distributions={reportData.enhancedAnalytics.distribution_analysis.distributions}
                insights={reportData.enhancedAnalytics.distribution_analysis.insights}
              />
            )}

          {reportData.shouldEmitInsights && reportData.clusterMetrics && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Behavioral Clusters</h3>
              <ClusterGaugeSection data={reportData.clusterMetrics} />
            </div>
          )}

          {reportData.shouldEmitInsights &&
            !reportData.clusterMetrics &&
            !reportData.personas.length &&
            !reportData.outcomeModel &&
            !reportData.enhancedAnalytics && (
              <ReportCharts
                qualityScore={reportData.metrics.dataQualityScore}
                segmentData={reportData.segmentData}
                compositionData={reportData.compositionData}
              />
            )}
        </div>
      ),
    },

    ...(reportData.shouldEmitInsights && reportData.personas.length > 0
      ? [
        {
          id: "personas",
          title: "Customer Personas",
          icon: SECTION_ICONS.insights,
          defaultOpen: false,
          content: <PersonaSection personas={reportData.personas} />,
        },
      ]
      : []),

    ...(reportData.shouldEmitInsights && reportData.outcomeModel
      ? [
        {
          id: "outcome-model",
          title: "Outcome Modeling",
          icon: SECTION_ICONS.anomalies,
          defaultOpen: false,
          content: <OutcomeModelSection data={reportData.outcomeModel} />,
        },
      ]
      : []),

    {
      id: "full-report",
      title: "Detailed Analysis",
      icon: SECTION_ICONS.insights,
      defaultOpen: false,
      content: (
        <>
          <TraceableText
            content={content || ""}
            segments={reportData.viewModel.traceability?.textSegments}
            onReferenceClick={(id) => handleFetchEvidenceSample({ contentSnippet: `Reference ${id}`, evidenceId: id })}
          />
          {limitationFootnote && <div className="mt-4 text-xs text-muted-foreground">{limitationFootnote}</div>}
        </>
      ),
    },
  ];

  // Helper to render the body content
  const renderReportBody = (isSimulated = false) => (
    <div id={isSimulated ? "report-content-simulated" : "report-content"} className={cn("space-y-8", isSimulated && "opacity-90")}>
      <TechnicalSection
        title="Narrative Insights"
        icon={SECTION_ICONS.insights as any}
        defaultOpen={true}
        className="mb-6"
      >
        <ReportInsightStoryboard
          sections={reportData.filteredSections}
          confidenceLevel={reportData.confidenceValue}
          safeMode={reportData.safeMode}
          hideActions={reportData.hideActions}
          getSectionLimitations={getSectionLimitations}
          onInspectEvidence={(payload) => handleFetchEvidenceSample({
            contentSnippet: payload.content,
            evidenceId: payload.id,
            sectionTitle: payload.title
          })}
        />
      </TechnicalSection>

      <div className="space-y-6">
        {accordionSections.map((section) => (
          <TechnicalSection
            key={section.id}
            title={section.title}
            icon={section.icon as any}
            defaultOpen={section.defaultOpen}
            onInspectEvidence={
              section.id === "full-report" || section.content?.toString().includes("TraceableText")
                ? () => { } // No evidence button for full report yet, or handle differently
                : undefined
            }
          >
            {section.content}
          </TechnicalSection>
        ))}
      </div>

      <ReportEvidenceInspector
        evidenceSections={reportData.evidenceSections}
        evidenceId={activeEvidenceId}
        evidencePreview={evidencePreview}
        evidenceSample={evidenceSample}
        evidenceLoading={evidenceLoading}
        evidenceError={evidenceError}
        onFetchEvidenceSample={handleFetchEvidenceSample}
        onCloseEvidence={handleCloseEvidence}
      />

      {/* Only show actions/personas in baseline or if we explicitly want them in sim */}
      {!isSimulated && (
        <>
          <ReportActionsPanel
            actions={reportData.mondayActions}
            hideActions={reportData.hideActions}
            confidenceLevel={reportData.confidenceValue}
            showAllActions={showAllActions}
            onToggleShowAll={() => setShowAllActions((v) => !v)}
          />

          <ReportPersonasPanel
            segments={reportData.measurableSegments}
            showAllPersonas={showAllPersonas}
            onToggleShowAll={() => setShowAllPersonas((v) => !v)}
          />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <ReportConclusion
              shouldUseFor={reportData.conclusion.shouldUseFor}
              shouldNotUseFor={reportData.conclusion.shouldNotUseFor}
              nextStep={reportData.conclusion.nextStep}
            />
          </motion.div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-accent/20 selection:text-accent-foreground animate-in fade-in duration-500">

      {/* 1. Hero Section (Full Bleed) */}
      <ExecutiveHero
        headline={reportData.viewModel.headline || "Analysis Report"}
        subheadline={formatBriefText({
          headline: '',
          keyFinding: reportData.heroInsight?.keyInsight || reportData.viewModel.subheadline,
          decision: reportData.executiveBrief?.recommendedAction,
          confidenceScore: 0
        }).split('\n')[0] || "Executive Summary"}
        date={reportData.metadata?.runId ? `Run: ${reportData.metadata.runId.substring(0, 8)}` : undefined}
        confidenceScore={Math.round(reportData.metrics.confidenceLevel * 100)}
        authorName="ACE System"
      />

      {/* 2. Main Content (Apple-Style Editorial Layout) */}
      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-8 md:px-16 lg:px-24 space-y-24 pb-40">

        {/* Metric Cards (Bento Grid) */}
        <KeyPerformanceIndicators
          confidence={Math.round(reportData.metrics.confidenceLevel * 100)}
          quality={Math.round(reportData.metrics.dataQualityScore * 100)}
          clusterCount={reportData.clusterMetrics?.clusterCount}
        />

        {/* Executive Brief (If exists) */}
        {reportData.executiveBrief && (
          <div className="max-w-4xl">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-6">Briefing</h3>
            <ExecutiveBrief
              brief={reportData.executiveBrief}
              status={reportData.safeMode ? "limited" : "success"}
            />
          </div>
        )}

        {/* Collapsible Sections (Visualizations, Clusters, Personas) */}
        <div className="space-y-16">
          {reportData.sections?.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-32">
              <div className="flex items-baseline justify-between border-b pb-4 mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-primary">
                  {section.title}
                </h2>
                <span className="text-sm font-mono text-muted-foreground opacity-50">
                  {section.id.toUpperCase()}
                </span>
              </div>

              {/* Dynamic Content Rendering based on ID */}
              {section.id === 'visualizations' && (
                <TechnicalSection
                  title="Visual Analysis"
                  content={reportData.enhancedAnalytics?.distribution_analysis?.insights?.[0] || "No visual insights available."}
                  metrics={reportData.metrics}
                  runId={runId || ""}
                />
              )}

              {section.id === 'personas' && reportData.personas.length > 0 && (
                <PersonaSection personas={reportData.personas} />
              )}

              <TraceableText
                content={typeof section.content === 'string' ? section.content : ''}
                className="prose-lg"
                onReferenceClick={setActiveEvidenceId}
              />
            </section>
          ))}

          {/* Default Technical Content Fallback */}
          {!reportData.sections?.length && (
            <div className="prose prose-slate dark:prose-invert max-w-none prose-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </main>

      {/* Modals & Overlays */}
      <GuidanceModal
        isOpen={isGuidanceModalOpen}
        onClose={() => setIsGuidanceModalOpen(false)}
        guidanceEntries={getGuidance(safeModeReasons)}
        onUploadNewDataset={() => window.location.href = '/'}
      />

      <ScopeLockModal
        open={Boolean(scopeLockDimension)}
        dimension={scopeLockDimension || undefined}
        onAcknowledge={() => setScopeLockDimension(null)}
      />

      {/* Simulation / Split View Controls (Hidden or Minimized) */}
      {simulationState.comparison_mode && (
        <div className="fixed bottom-0 left-0 w-full bg-background border-t p-4 z-50">
          <SimulationControls />
        </div>
      )}
      <AskAce />
    </div>
  );
}

export default WideReportViewer;
