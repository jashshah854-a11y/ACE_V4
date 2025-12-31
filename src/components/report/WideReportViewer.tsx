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
import { useSmoothScroll, formatBriefText } from "@/hooks/useSmoothScroll";
import { TechnicalSection } from "@/components/report/technical/TechnicalSection";

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={cn("w-full", className)}>
      <ReportDataValidator data={reportData} content={content || ""}>

        <InsightCanvasLayout
          navigation={
            <NavigationRail
              items={reportData.viewModel?.navigation || []}
              activeSection={currentSection}
              onNavigate={handleSectionClick}
            />
          }
          rightRail={
            <div className="space-y-4">
              {/* Evidence Panel Content */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold">Evidence Lab</span>
                <button onClick={handleCloseEvidence} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
              </div>

              {reportData.safeMode && (
                <WhyExplainer
                  reasons={safeModeReasons}
                  className="mb-4 bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                />
              )}


              <TableOfContents sections={reportData.evidenceSections} />
              <EvidencePanel records={evidenceRegistry} />

              {/* Reuse existing Evidence Inspector */}
              <ReportEvidenceInspector
                evidenceSections={reportData.evidenceSections}
                evidencePreview={evidencePreview}
                evidenceSample={evidenceSample}
                evidenceLoading={evidenceLoading}
                evidenceError={evidenceError}
                onFetchEvidenceSample={handleFetchEvidenceSample}
                onCloseEvidence={handleCloseEvidence}
              />

              <IntelligenceRail
                keyTakeaways={reportData.keyTakeaways}
                criticalIssues={{
                  count: reportData.metrics.anomalyCount || 0,
                  items: reportData.metrics.anomalyCount ? [`${reportData.metrics.anomalyCount} anomalies detected`] : [],
                }}
                quickStats={{
                  dataQuality: reportData.metrics.dataQualityScore,
                  confidence: reportData.metrics.confidenceLevel,
                  anomalies: reportData.metrics.anomalyCount,
                }}
                sections={reportData.evidenceSections.map((s) => ({ id: s.id, title: s.title }))}
                currentSection={currentSection}
                readingProgress={readingProgress}
                onSectionClick={handleSectionClick}
              />
            </div>
          }
          isRightRailOpen={isRightRailOpen}
          mainContent={
            <>
              {missingIdentityFields?.length ? (
                <LimitationBanner
                  message="Dataset identity card flagged missing fields. Gaps are surfaced before visuals."
                  fields={missingIdentityFields}
                  severity="warning"
                  className="mb-4"
                />
              ) : null}

              {/* Executive TL;DR Brief */}
              <ExecutiveBrief
                headline={reportData.viewModel.headline || "Report Analysis"}
                keyFinding={reportData.heroInsight?.keyInsight || reportData.viewModel.subheadline || "Key insights extracted."}
                decision={reportData.executiveBrief?.recommendedAction || reportData.executiveBrief?.purpose || "Review full report for details."}
                status={reportData.safeMode ? "caution" : "optimal"}
                accentColor="teal"
                confidenceSignal={reportData.viewModel.header?.signal || { value: "medium", confidenceScore: 0.8, label: "Medium Confidence" }}
                onCopy={() => {
                  const briefText = formatBriefText({
                    headline: reportData.viewModel.headline,
                    keyFinding: reportData.heroInsight?.keyInsight,
                    decision: reportData.executiveBrief?.recommendedAction,
                    confidenceScore: reportData.confidenceValue || 0,
                  });
                  navigator.clipboard.writeText(briefText);
                  toast({ title: "Brief copied to clipboard" });
                }}
                onFindingClick={() => scrollToSection('executive-summary')}
                onDecisionClick={() => {
                  if (reportData.safeMode) {
                    setIsGuidanceModalOpen(true);
                  } else {
                    scrollToSection('recommendations');
                  }
                }}
              />

              <SafeModeBanner
                safeMode={reportData.safeMode}
                limitationsReason={safeModeReasons[0] || null}
                onHelpClick={() => setIsGuidanceModalOpen(true)}
              />
              <ReportHero
                title={reportData.viewModel.meta?.title || reportData.viewModel.headline || "Analysis Report"}
                runId={runId}
                safeMode={reportData.safeMode}
                confidenceLevel={reportData.confidenceValue}
                signal={{
                  strength: (reportData.confidenceValue || 0) >= 80 ? "high" : (reportData.confidenceValue || 0) >= 50 ? "moderate" : "low",
                  bars: (reportData.confidenceValue || 0) >= 80 ? 3 : (reportData.confidenceValue || 0) >= 50 ? 2 : 1,
                  color: (reportData.confidenceValue || 0) >= 80 ? "teal" : "amber",
                  label: "AI Confidence",
                  confidenceScore: reportData.confidenceValue || 0
                }}
                limitationsReason={safeModeReasons[0] || null}
                taskContractSummary={reportData.taskContractSummary}
                decisionSummary={reportData.decisionSummary}
                primaryQuestion={reportData.primaryQuestion}
                runContext={reportData.runContext}
                narrativeSummary={reportData.narrativeSummary}
                onPdfExport={handlePptxExport}
              />
              <ReportMetricsStrip
                confidenceValue={reportData.confidenceValue}
                dataQualityValue={reportData.dataQualityValue}
                clusterMetrics={reportData.clusterMetrics}
              />
              <div className="flex justify-end mb-4 px-2">
                <SignalStrength
                  strength={reportData.confidenceValue >= 80 ? "high" : reportData.confidenceValue >= 50 ? "moderate" : "low"}
                  score={reportData.confidenceValue}
                />
              </div>
              <div className="flex justify-end mb-4 px-2">
                <SignalStrength
                  strength={reportData.confidenceValue >= 80 ? "high" : reportData.confidenceValue >= 50 ? "moderate" : "low"}
                  score={reportData.confidenceValue}
                />
              </div>
              <HighlightsRibbon highlights={reportData.highlights} />
              <IdentityTrustStrip
                identityStats={reportData.identityStats}
                confidenceLevel={reportData.metrics.confidenceLevel}
                uncertaintySignals={reportData.uncertaintySignals}
              />
              <DiagnosticsCard
                confidenceMode={confidenceMode}
                safeModeReasons={safeModeReasons}
                decisionSummary={reportData.decisionSummary}
                taskContractSummary={reportData.taskContractSummary}
                hasTimeField={reportData.hasTimeField}
                onConfidenceModeChange={setConfidenceMode}
              />

              {reportData.shouldEmitInsights ? (
                <>
                  <HeroInsightPanel {...reportData.heroInsight} />
                  {reportData.mondayActions.length > 0 && !reportData.hideActions && (
                    <MondayMorningActions actions={reportData.mondayActions} className="mt-8" />
                  )}
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-6 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30">
                  Insights are suppressed due to confidence/contract/validation gates.
                </div>
              )}

              {(reportData.decisionSummary || reportData.taskContractSummary) && (
                <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="text-sm font-semibold text-foreground">Decision & Task Contract</div>
                  {reportData.decisionSummary && <p className="text-sm text-foreground whitespace-pre-line">{reportData.decisionSummary}</p>}
                  {reportData.taskContractSummary && <p className="text-xs text-muted-foreground whitespace-pre-line">{reportData.taskContractSummary}</p>}
                </div>
              )}

              <ReportToolbar
                runId={runId}
                copied={copied}
                diffRunId={diffRunId}
                diffLoading={diffLoading}
                pptxLoading={pptxLoading}
                onCopy={handleCopy}
                onDownloadMarkdown={handleDownloadMarkdown}
                onRunDiff={handleRunDiff}
                onPptxExport={handlePptxExport}
                onDiffRunIdChange={setDiffRunId}
              />

              {(diffError || diffData) && (
                <Card className="mb-4 p-3">
                  <div className="text-sm font-semibold mb-1">Run Diff</div>
                  {diffError && <div className="text-xs text-red-600">{diffError}</div>}
                  {diffData && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Confidence delta: {diffData.confidence_delta ?? "n/a"}</div>
                      <div>New segments: {(diffData.new_segments || []).length}</div>
                      <div>Removed segments: {(diffData.removed_segments || []).length}</div>
                      <div>New personas: {(diffData.new_personas || []).length}</div>
                      <div>Evidence changes: {(diffData.evidence_changes || []).length}</div>
                    </div>
                  )}
                </Card>
              )}

              {pptxError && (
                <Card className="mb-4 p-3">
                  <div className="text-sm font-semibold text-red-700">PPTX Export</div>
                  <div className="text-xs text-red-700">{pptxError}</div>
                </Card>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                {/* Old ExecutiveBrief removed - replaced with new TL;DR design at top */}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <TechnicalDetailsSection metrics={reportData.metrics} runId={runId} />
              </motion.div>

              {simulationState.comparison_mode ? (
                <SplitReportViewer
                  baselineContent={renderReportBody(false)}
                  simulatedContent={renderReportBody(true)}
                />
              ) : (
                renderReportBody(false)
              )}
            </>
          }
        />

      </ReportDataValidator>

      {/* Scope Lock Modal */}
      <ScopeLockModal
        open={Boolean(scopeLockDimension)}
        dimension={scopeLockDimension || undefined}
        onAcknowledge={() => setScopeLockDimension(null)}
      />

      {/* Guidance Modal for error remediation */}
      <GuidanceModal
        isOpen={isGuidanceModalOpen}
        onClose={() => setIsGuidanceModalOpen(false)}
        guidanceEntries={getGuidance(safeModeReasons)}
        onUploadNewDataset={() => {
          setIsGuidanceModalOpen(false);
          // TODO: Implement navigation to upload page
          window.location.href = '/';
        }}
      />
    </motion.div>
  );
}

export default WideReportViewer;
