
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StoryHeadline } from "@/components/report/story/StoryHeadline";
import { SentimentBlock } from "@/components/report/story/SentimentBlock";
import { ActionChecklist } from "@/components/report/story/ActionChecklist";
import { PersonaDeck } from "@/components/report/story/PersonaDeck";
import { ConfidenceGauge } from "@/components/report/story/ConfidenceGauge";
import { StorySkeleton } from "@/components/report/story/StorySkeleton";
import { StoryControlBar } from "@/components/report/story/StoryControlBar";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Clock,
  Sparkles,
  BarChart3,
  TrendingUp,
  Zap,
  Lightbulb,
  Shield,
  Activity,
  Users
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { StoryView } from "@/components/story/StoryView";
import { ValidationSummaryPanel } from "@/components/trust/ValidationSummaryPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getReport } from "@/lib/api-client";
import type { SimulationResult, Modification } from "@/lib/api-client";
import { getRecentReports, getDiagnosticsCache, extractDiagnosticsNotes } from "@/lib/localStorage";
import { useReportData } from "@/hooks/useReportData";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { SignalWidget } from "@/components/trust/SignalWidget";
import { LimitationBanner } from "@/components/report/LimitationBanner";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { TopDriversCard } from "@/components/report/analytics/TopDriversCard";
import { CorrelationInsightsCard } from "@/components/report/analytics/CorrelationInsightsCard";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";
import EvidenceRail from "@/components/report/EvidenceRail";
import SimulationControls from "@/components/report/SimulationControls";
import { TimelineHelper } from "@/components/report/TimelineHelper";
import { GuidanceOverlay } from "@/components/report/GuidanceOverlay";
import { focusGuidance, focusEvidenceSection } from "@/lib/guidanceFocus";
import { useTaskContext } from "@/context/TaskContext";
import { CuratedKpiPanel } from "@/components/report/story/CuratedKpiPanel";
import { useCuratedKpis } from "@/hooks/useCuratedKpis";
import { ExecutiveKpiGrid } from "@/components/report/ExecutiveKpiGrid"; // New Component
import { NarrativeModeSelector } from "@/components/narrative/NarrativeModeSelector";
import { ConfidenceBadge } from "@/components/trust/ConfidenceBadge";
import { useNarrative } from "@/components/narrative/NarrativeContext";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { TrustBreakdown } from "@/components/trust/TrustBreakdown";

const ExecutivePulse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [recentReports, setRecentReports] = useState(() => getRecentReports());
  const [recentReportHints, setRecentReportHints] = useState<Record<string, string[]>>({});
  const initialRun = searchParams.get("run") || recentReports[0]?.runId || "";
  const [runInput, setRunInput] = useState(initialRun);
  const [activeRun, setActiveRun] = useState(initialRun);
  const [simulationEvidence, setSimulationEvidence] = useState<{
    result: SimulationResult | null;
    modifications: Modification[];
  }>({
    result: null,
    modifications: [],
  });

  // --- Effects ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshRecents = () => setRecentReports(getRecentReports());
    refreshRecents();
    window.addEventListener("focus", refreshRecents);
    window.addEventListener("storage", refreshRecents);
    return () => {
      window.removeEventListener("focus", refreshRecents);
      window.removeEventListener("storage", refreshRecents);
    };
  }, []);

  useEffect(() => {
    const map: Record<string, string[]> = {};
    recentReports.forEach((report) => {
      const notes = extractDiagnosticsNotes(getDiagnosticsCache(report.runId));
      if (notes.length) {
        map[report.runId] = notes;
      }
    });
    setRecentReportHints(map);
  }, [recentReports]);

  // --- State ---
  const [viewMode, setViewMode] = useState<"story" | "technical">("story");

  // --- Queries ---
  const reportQuery = useQuery({
    queryKey: ["executive-pulse", activeRun],
    queryFn: () => getReport(activeRun),
    enabled: Boolean(activeRun),
    staleTime: 30000,
    retry: false,
  });

  const { data: governedReport } = useGovernedReport(activeRun);
  const reportData = useReportData(reportQuery.data || "", activeRun, "strict", governedReport);
  const storyData = reportData.viewModel;

  // --- Evidence Scoping ---
  const evidenceScopeMap = useMemo(() => {
    const scopeIndex: Record<string, string> = {};
    Object.values(reportData.evidenceMap || {}).forEach((entry) => {
      if (entry?.scope) {
        scopeIndex[entry.scope] = entry.id;
      }
    });
    return scopeIndex;
  }, [reportData.evidenceMap]);

  const { kpis: curatedKpis, loading: kpiLoading, sourceLabel: kpiSourceLabel } = useCuratedKpis(activeRun, {
    confidenceValue: reportData.confidenceValue,
    dataQualityValue: reportData.dataQualityValue,
    identityStats: reportData.identityStats,
    metrics: reportData.metrics,
    personas: reportData.personas,
    clusterMetrics: reportData.clusterMetrics,
  });

  const { setSafeMode } = useSimulation();
  const { mode: narrativeMode } = useNarrative();

  const handleEvidenceFocus = useCallback(
    ({ section, evidenceId }: { section: string; evidenceId?: string }) => {
      const scopedEvidence = evidenceId ?? evidenceScopeMap[section];
      focusEvidenceSection(section, scopedEvidence ? { evidenceId: scopedEvidence } : {});
    },
    [evidenceScopeMap],
  );

  const handleSimulationReport = useCallback(
    (result: SimulationResult | null, context?: { modifications: Modification[] }) => {
      setSimulationEvidence({
        result,
        modifications: context?.modifications ?? [],
      });
      if (result) {
        focusEvidenceSection("business_intelligence");
      }
    },
    [],
  );

  const businessEvidenceId = evidenceScopeMap["business_intelligence"];
  const predictiveEvidenceId = evidenceScopeMap["feature_importance"];
  const clusteringEvidenceId = evidenceScopeMap["clustering"];

  const { updateTaskContract } = useTaskContext();

  useEffect(() => {
    if (reportData.primaryQuestion || reportData.successCriteria) {
      updateTaskContract({
        primaryQuestion: reportData.primaryQuestion,
        successCriteria: reportData.successCriteria,
      });
    }
  }, [reportData.primaryQuestion, reportData.successCriteria, updateTaskContract]);

  // --- Computed Values ---
  const guidanceHint = useMemo(() => {
    if (Array.isArray(reportData.guidanceNotes) && reportData.guidanceNotes.length) {
      return reportData.guidanceNotes[0];
    }
    const fallback = recentReportHints[activeRun]?.[0];
    if (fallback) {
      return {
        id: `cached-${activeRun}`,
        message: fallback,
        severity: "warning" as const,
        source: "Diagnostics",
      };
    }
    return null;
  }, [reportData.guidanceNotes, recentReportHints, activeRun]);

  // Sync Safe Mode
  useEffect(() => {
    setSafeMode(reportData.safeMode);
  }, [reportData.safeMode, setSafeMode]);

  const scqaModules = reportData.narrativeModules || [];
  const scopeLocks = reportData.scopeLocks || [];
  const profileMeta = (reportData.profile ?? {}) as Record<string, any>;
  const identityRows = typeof reportData.identityStats?.rows === "number"
    ? reportData.identityStats.rows.toLocaleString()
    : reportData.identityStats?.rows || "n/a";
  const columnCount = profileMeta.column_count ?? profileMeta.columnCount ?? (reportData.profile?.columns ? Object.keys(reportData.profile.columns).length : undefined);
  const dataClarityPercent = Math.round(reportData.dataQualityValue || 0);
  const aiConfidencePercent = Math.round(reportData.confidenceValue || 0);
  const numericColumns = Array.isArray(reportData.profile?.numericColumns)
    ? (reportData.profile?.numericColumns as string[])
    : Array.isArray(profileMeta.numericColumns)
      ? (profileMeta.numericColumns as string[])
      : [];

  const handleSwitchRun = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    setActiveRun(sanitized);
    navigate(`/app?run=${sanitized}`);
  };

  const hasData = activeRun && reportQuery.data;
  const executiveBrief = reportData.governingTrust?.band === "caution"
    ? ["Executive summary suppressed until trust improves. Review validation and expand sample size."]
    : storyData.executiveBrief;
  const storyDataForBrief = { ...storyData, executiveBrief };
  const summarizedContent = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const first = lines[0] || content;
    return first.length > 240 ? `${first.slice(0, 237)}...` : first;
  };

  const contentForMode = (content: string, impact?: string, trustBand?: "certified" | "conditional" | "caution") => {
    if (narrativeMode === "executive") {
      return summarizedContent(applyTrustTone(content, trustBand));
    }
    if (narrativeMode === "expert" && impact) {
      return `${applyTrustTone(content, trustBand)}\n\nAssumptions & caveats: ${impact}`;
    }
    return applyTrustTone(content, trustBand);
  };

  const applyTrustTone = (content: string, trustBand?: "certified" | "conditional" | "caution") => {
    if (!trustBand) return content;
    if (trustBand === "certified") return content;
    if (trustBand === "conditional") {
      return `This insight is directional and should be considered with context. ${content}`;
    }
    return `This signal is preliminary and should not drive action yet. ${content}`;
  };

  // --- New KPI Grid Data ---
  const executiveMetrics = [
    { label: "Total Rows", value: identityRows, icon: Activity },
    { label: "Fields", value: columnCount || "Scanning...", icon: BarChart3 },
    { label: "Data Quality", value: `${dataClarityPercent}%`, icon: Shield, className: dataClarityPercent > 80 ? "border-green-500/20" : "border-amber-500/20" },
    { label: "AI Confidence", value: `${aiConfidencePercent}%`, icon: Zap, className: aiConfidencePercent > 80 ? "border-blue-500/20" : "border-amber-500/20" },
  ];

  const confidenceLevel = aiConfidencePercent > 80 ? "high" : aiConfidencePercent > 50 ? "medium" : "low";
  const validationIssues = reportData.diagnostics?.validation?.failed_fields || [];
  const validationStatus = validationIssues.length ? "Borderline checks" : "Passed core checks";
  const insightPolicy = reportData.shouldEmitInsights
    ? "endorsed"
    : reportData.safeMode
      ? "limited"
      : "blocked";


  // --- Empty State ---
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden mt-10"
    >
      <div className="p-8 md:p-12 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        >
          <SafeIcon icon={BarChart3} className="w-10 h-10 text-primary" />
        </motion.div>

        <h2 className="text-2xl md:text-3xl font-bold mb-3">Executive Pulse</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          High-density intelligence dashboard. View prioritized insights, monitor key metrics, and simulate outcomes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={() => navigate("/upload")} size="lg" className="gap-2">
            <SafeIcon icon={Upload} className="w-4 h-4" /> Upload Dataset
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/reports")} className="gap-2">
            <SafeIcon icon={FileText} className="w-4 h-4" /> View Reports
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container px-4 max-w-7xl">

          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight">Executive Pulse</h1>
                {activeRun && (
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-mono text-muted-foreground">
                    {activeRun.slice(0, 8)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">Strategic intelligence readout and simulation lab.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
              <NarrativeModeSelector />

              <div className="flex gap-2">
                <div className="relative">
                  <Input
                    value={runInput}
                    onChange={(e) => setRunInput(e.target.value)}
                    placeholder="Run ID"
                    className="font-mono text-sm w-40 pl-8"
                    onKeyDown={(e) => e.key === "Enter" && handleSwitchRun()}
                  />
                  <FileText className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                </div>
                <Button onClick={handleSwitchRun} disabled={!runInput.trim()}>Load</Button>
              </div>
            </div>
          </div>

          {!hasData ? (
            <EmptyState />
          ) : (
            <div className="animate-in fade-in duration-500">
              {/* 1. Standardized KPI Grid */}
              <ExecutiveKpiGrid metrics={executiveMetrics} />

              {/* 2. Main 2-Column Layout */}
              <div className="grid gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">

                {/* Left Column: Narrative & Insights */}
                <div className="space-y-8 min-w-0">
                  {/* New Hero Insight Card */}
                  <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-card to-background p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-primary/80">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Governing Thought</span>
                      <div className="ml-auto flex items-center gap-2">
                        {reportData.governingTrust && (
                          <TrustBadge trust={reportData.governingTrust} showScore={true} />
                        )}
                        <ConfidenceBadge
                          level={confidenceLevel}
                          score={reportData.confidenceValue}
                          showLabel={false}
                          details={{
                            dataCoverage: reportData.dataQualityValue ? `${Math.round(reportData.dataQualityValue)}% coverage` : undefined,
                            validationStatus,
                            sampleSufficiency: reportData.identityStats?.rows ? `Rows: ${reportData.identityStats.rows}` : undefined,
                          }}
                        />
                      </div>
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl leading-tight text-foreground mb-4">
                      {reportData.governingThought || storyData.heroInsight?.keyInsight || "Analyzing strategic implications..."}
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {reportData.primaryQuestion ? `Addressing: "${reportData.primaryQuestion}"` : "No primary question defined for this analysis."}
                    </p>
                    {reportData.governingTrust && (
                      <div className="mt-4 max-w-xl">
                        <TrustBreakdown trust={reportData.governingTrust} mode={narrativeMode} />
                      </div>
                    )}
                  </div>

                  {/* Warnings */}
                  {reportData.governanceWarnings?.length ? (
                    <div className="space-y-2">
                      {reportData.governanceWarnings.slice(0, 3).map((warning, idx) => (
                        <LimitationBanner
                          key={`gov-warning-${idx}`}
                          message={warning}
                          severity={warning.toLowerCase().includes('safe mode') ? 'critical' : 'warning'}
                        />
                      ))}
                    </div>
                  ) : null}

                  {/* Story Content */}
                  <div className="space-y-12">
                    {/* Headline & Evidence Link */}
                    <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
                      <StoryHeadline data={storyDataForBrief} onHighlight={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })} />
                      <div className="mt-8 flex justify-center">
                        <StoryControlBar data={storyDataForBrief} trustBand={reportData.governingTrust?.band} />
                      </div>
                    </div>

                    {/* Interactive Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <TopDriversCard
                        data={reportData.enhancedAnalytics?.feature_importance}
                        safeMode={reportData.safeMode}
                        onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                      />
                      <CorrelationInsightsCard
                        data={reportData.enhancedAnalytics?.correlation_analysis}
                        onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                      />
                    </div>

                    {/* Narrative Blocks */}
                    {storyData.sections.map((section, idx) => {
                      if (section.type === "recommendation" && section.listItems?.length) {
                        const items = narrativeMode === "executive"
                          ? section.listItems.slice(0, 3)
                          : section.listItems;
                        if (section.trust?.band === "caution") {
                          return (
                            <LimitationBanner
                              key={idx}
                              message="Recommendations are gated until trust improves. Review validation and expand sample size."
                              severity="warning"
                            />
                          );
                        }
                        return (
                          <ActionChecklist
                            key={idx}
                            title={section.title}
                            items={items}
                            onViewEvidence={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })}
                          />
                        );
                      }
                      return (
                        <SentimentBlock
                          key={idx}
                          title={section.title}
                          sentiment={section.sentiment}
                          impact={section.impact}
                          trust={section.trust}
                          insightId={section.id}
                        >
                          <ReactMarkdown>{contentForMode(section.content, section.impact, section.trust?.band)}</ReactMarkdown>
                        </SentimentBlock>
                      );
                    })}
                  </div>

                  {/* Validation Footer */}
                  <div className="pt-4">
                    <ValidationSummaryPanel
                      dataQualityScore={reportData.dataQualityValue}
                      suppressedCount={0} // Placeholder
                      issues={reportData.confidenceValue && reportData.confidenceValue < 60 ? [{ type: 'warning', message: 'Low confidence detected in recent samples.' }] : []}
                      insightPolicy={insightPolicy}
                    />
                  </div>
                </div>

                {/* Right Column: Lab & Controls */}
                <aside className="space-y-6 lg:sticky lg:top-24 self-start h-fit">
                  <GuidanceOverlay notes={reportData.guidanceNotes} context="global" />
                  <ValidationSummaryPanel
                    dataQualityScore={reportData.dataQualityValue}
                    suppressedCount={0}
                    issues={reportData.confidenceValue && reportData.confidenceValue < 60 ? [{ type: 'warning', message: 'Low confidence detected in recent samples.' }] : []}
                    insightPolicy={insightPolicy}
                  />
                  {/* Scope Locks */}
                  {scopeLocks.length > 0 && (
                    <div className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-5">
                      <div className="flex flex-wrap gap-2">
                        {scopeLocks.map((lock, idx) => (
                          <span key={idx} className="bg-white px-2 py-1 rounded-md text-xs border border-amber-100 text-amber-900 shadow-sm">
                            {lock.dimension}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab Controls */}
                  <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" /> Strategy Lab
                      </h3>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">v4.0</span>
                    </div>
                    <SimulationControls
                      runId={activeRun}
                      availableColumns={numericColumns}
                      hint={guidanceHint?.message}
                      onSimulationResult={handleSimulationReport}
                    />
                  </div>

                  {/* Evidence Rail */}
                  <EvidenceRail
                    mode="inline"
                    data={reportData}
                    runId={activeRun}
                    onFocusGuidance={() => focusGuidance("global")}
                    simulationResult={simulationEvidence.result}
                    simulationModifications={simulationEvidence.modifications}
                  />
                </aside>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ExecutivePulse;
