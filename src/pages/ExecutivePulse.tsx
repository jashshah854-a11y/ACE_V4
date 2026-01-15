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
import { AskAce } from "@/components/report/story/AskAce";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  BarChart3,
  TrendingUp,
  Zap,
  Lightbulb
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getReport } from "@/lib/api-client";
import type { SimulationResult, Modification } from "@/lib/api-client";
import { getRecentReports, getDiagnosticsCache, extractDiagnosticsNotes } from "@/lib/localStorage";
import { useReportData } from "@/hooks/useReportData";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { InsightBlock } from "@/components/report/InsightBlock";
import { SignalWidget } from "@/components/trust/SignalWidget";
import { LimitationBanner } from "@/components/report/LimitationBanner";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { TopDriversCard } from "@/components/report/analytics/TopDriversCard";
import { CorrelationInsightsCard } from "@/components/report/analytics/CorrelationInsightsCard";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";
import { translateTechnicalTerm } from "@/lib/dataTypeMapping";
import EvidenceRail from "@/components/report/EvidenceRail";
import SimulationControls from "@/components/report/SimulationControls";
import { TimelineHelper } from "@/components/report/TimelineHelper";
import { GuidanceOverlay } from "@/components/report/GuidanceOverlay";
import { focusGuidance, focusEvidenceSection } from "@/lib/guidanceFocus";
import { useTaskContext } from "@/context/TaskContext";
import { CuratedKpiPanel } from "@/components/report/story/CuratedKpiPanel";
import { useCuratedKpis } from "@/hooks/useCuratedKpis";

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

  const [viewMode, setViewMode] = useState<"story" | "technical">("story");

  const reportQuery = useQuery({
    queryKey: ["executive-pulse", activeRun],
    queryFn: () => getReport(activeRun),
    enabled: Boolean(activeRun),
    staleTime: 30000,
    refetchInterval: (query) => {
      // Retry if report is not ready yet (handle various error types confidently)
      const error = query.state.error;
      if (error) {
        const msg = (error as any).message || String(error);
        if (msg.includes("404") || msg.includes("Report not generated yet")) {
          return 3000;
        }
      }
      return false;
    },
  });

  const { data: governedReport } = useGovernedReport(activeRun);
  const reportData = useReportData(reportQuery.data || "", activeRun, "strict", governedReport);
  const storyData = reportData.viewModel;
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

  // Sync Safe Mode state
  useEffect(() => {
    setSafeMode(reportData.safeMode);
  }, [reportData.safeMode, setSafeMode]);

  const scqaModules = reportData.narrativeModules || [];
  const scopeLocks = reportData.scopeLocks || [];
  const profileMeta = (reportData.profile ?? {}) as Record<string, any>;
  const identityRows =
    typeof reportData.identityStats?.rows === "number"
      ? reportData.identityStats.rows.toLocaleString()
      : reportData.identityStats?.rows || "n/a";
  const columnCount =
    profileMeta.column_count ??
    profileMeta.columnCount ??
    (reportData.profile?.columns
      ? Object.keys(reportData.profile.columns).length
      : undefined);
  const dataClarityPercent = Math.round(reportData.dataQualityValue || 0);
  const aiConfidencePercent = Math.round(reportData.confidenceValue || 0);
  const numericColumns = Array.isArray(reportData.profile?.numericColumns)
    ? (reportData.profile?.numericColumns as string[])
    : Array.isArray(profileMeta.numericColumns)
      ? (profileMeta.numericColumns as string[])
      : [];
  const businessIntel = reportData.enhancedAnalytics?.business_intelligence;
  const ghostRevenueRatio = businessIntel?.value_metrics?.value_concentration ?? 0;
  const showGhostRevenue = ghostRevenueRatio > 0.45;
  const zombieSegments = (businessIntel?.segment_value || []).filter((segment: any) => (segment.value_contribution_pct ?? 0) < 5);
  const showZombieAlerts = zombieSegments.length > 0;

  const prioritizedSections = useMemo(() => {
    const ranked = [...(reportData.scoredSections || [])].sort((a, b) => b.importance - a.importance);
    const primary = ranked.filter((section) => section.importance >= 0.5).slice(0, 4);
    if (primary.length === 0) {
      return { primary: ranked.slice(0, 2), appendix: ranked.slice(2) };
    }
    const appendix = ranked.filter((section) => !primary.includes(section));
    return { primary, appendix };
  }, [reportData.scoredSections]);

  const missingFields = reportData.diagnostics?.identity?.missing_fields as string[] | undefined;

  const handleSwitchRun = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    setActiveRun(sanitized);
    navigate(`/report/summary?run=${sanitized}`);
  };

  const hasData = activeRun && reportQuery.data && prioritizedSections.primary.length > 0;

  // Redirect to upload if no runs exist
  // useEffect(() => {
  //   if (recentReports.length === 0 && !searchParams.get("run")) {
  //     navigate("/upload");
  //   }
  // }, [recentReports.length, searchParams, navigate]);


  // Empty State Component
  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden"
    >
      {/* Hero Section */}
      <div className="p-8 md:p-12 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
        >
          <SafeIcon icon={BarChart3} className="w-10 h-10 text-primary" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold mb-3"
        >
          Welcome to Executive Pulse
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground max-w-md mx-auto mb-8"
        >
          Your high-density data analysis dashboard. Upload a dataset or enter a run ID to see prioritized insights.
        </motion.p>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button
            onClick={() => navigate("/upload")}
            size="lg"
            className="gap-2"
          >
            <SafeIcon icon={Upload} className="w-4 h-4" />
            Upload Dataset
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate("/reports")}
            className="gap-2"
          >
            <SafeIcon icon={FileText} className="w-4 h-4" />
            View Reports
          </Button>
        </motion.div>
      </div>

      {/* Recent Reports Section */}
      {recentReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="border-t border-border/40 p-6 bg-muted/30"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <SafeIcon icon={Clock} className="w-4 h-4" />
            Recent Reports
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentReports.slice(0, 3).map((report, index) => (
              <motion.button
                key={report.runId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => {
                  navigate(`/reports?run=${report.runId}`);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <SafeIcon icon={FileText} className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">

                  <p className="font-medium text-sm truncate">{report.title || "Analysis Report"}</p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">

                    <code className="font-mono">{report.runId.slice(0, 8)}</code>

                    {report.createdAt && (

                      <>

                        <span>?</span>

                        <span className="truncate">{report.createdAt}</span>

                      </>

                    )}

                  </div>

                  {recentReportHints[report.runId]?.length ? (

                    <p className="text-[11px] text-amber-800 mt-1 line-clamp-2">

                      {recentReportHints[report.runId][0]}

                    </p>

                  ) : (

                    <p className="text-[11px] text-muted-foreground/80 mt-1">Diagnostics pending?</p>

                  )}

                </div>

                <SafeIcon icon={ArrowRight} className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Features Grid */}
      <div className="border-t border-border/40 p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { Icon: Sparkles, title: "AI-Powered", desc: "Intelligent insight extraction" },
            { Icon: TrendingUp, title: "Prioritized", desc: "Focus on what matters most" },
            { Icon: Zap, title: "Real-time", desc: "Live analysis updates" },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-muted/30"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <feature.Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container px-4 max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Executive Pulse</h1>
              <p className="text-muted-foreground text-sm">High-density readout constrained to a single screen.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="Enter Run ID"
                className="font-mono text-sm w-40 md:w-48"
                onKeyDown={(e) => e.key === "Enter" && handleSwitchRun()}
              />
              <Button onClick={handleSwitchRun} disabled={!runInput.trim()}>Load</Button>
            </div>
          </div>

          {/* Show empty state or data */}
          {!hasData ? (
            <EmptyState />
          ) : (
            <>

              {/* Status Bar & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-border/40 mb-6">
                <div className="bg-muted/50 p-1 rounded-lg inline-flex self-start sm:self-auto">
                  <button
                    onClick={() => setViewMode("story")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      viewMode === "story"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Story
                  </button>
                  <button
                    onClick={() => setViewMode("technical")}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                      viewMode === "technical"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Technical
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {viewMode === "technical" ? (
                    <>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Run:</span>
                        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{activeRun.slice(0, 8)}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase text-muted-foreground">Report Trust:</span>
                        <SignalWidget score={(reportData.confidenceValue || 0) / 100} compact={true} />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <ConfidenceGauge value={reportData.confidenceValue || 0} size="sm" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        System Confidence
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {missingFields?.length ? (
                <LimitationBanner
                  message="Dataset identity card reports missing columns. Lower-tier insights are collapsed automatically."
                  fields={missingFields}
                />
              ) : null}

              {viewMode === "story" ? (
                reportQuery.isLoading ? (
                  <StorySkeleton />
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[minmax(220px,0.28fr)_minmax(0,1fr)_minmax(280px,0.32fr)] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]">
                    <aside className="space-y-5 xl:sticky xl:top-32 self-start">
                      <div className="rounded-3xl border border-border/40 bg-card/80 p-5 shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Dataset Identity</p>
                        <div className="mt-3 space-y-1">
                          <p className="font-serif text-2xl text-foreground">{identityRows}</p>
                          <p className="text-sm text-muted-foreground">
                            {columnCount ? `${columnCount} fields` : "Column scan active"}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground/70">Run {activeRun.slice(0, 8)}</p>
                        </div>
                        <div className="mt-5 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Data Clarity</span>
                            <span className="font-semibold">{dataClarityPercent}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">AI Confidence</span>
                            <span className="font-semibold">{aiConfidencePercent}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-border/40 bg-card/80 p-5 shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Trust Signals</p>
                        <div className="mt-4 flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                            <ConfidenceGauge value={reportData.confidenceValue || 0} size="sm" />
                            <div>
                              <p className="text-[10px] uppercase text-muted-foreground tracking-[0.3em]">System Confidence</p>
                              <p className="text-sm font-semibold">{aiConfidencePercent}%</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground tracking-[0.3em]">Clarity Ruling</p>
                            <p className="text-sm font-semibold text-foreground">{dataClarityPercent}% clean</p>
                          </div>
                        </div>
                      </div>
                      {(showGhostRevenue || showZombieAlerts) && (
                        <div className="rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5 shadow-sm text-sm text-fuchsia-100">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-fuchsia-200">Ghost & Zombie Watch</p>
                          {showGhostRevenue && (
                            <p className="mt-2">Ghost revenue concentration at {(ghostRevenueRatio * 100).toFixed(0)}% of value.</p>
                          )}
                          {showZombieAlerts && (
                            <p className="mt-2">Zombie cohorts: {zombieSegments.slice(0, 2).map((seg: any) => seg.segment).join(', ')}{zombieSegments.length > 2 ? '...' : ''}</p>
                          )}
                        </div>
                      )}
                      {scopeLocks.length ? (
                        <div className="rounded-3xl border border-amber-200/70 bg-amber-50 p-5 shadow-sm dark:bg-amber-950/10">
                          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700">Scope Locks</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {scopeLocks.map((lock, idx) => (
                              <span
                                key={`${lock.dimension}-${idx}`}
                                className="rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:bg-transparent"
                                title={lock.reason}
                              >
                                {lock.dimension}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {guidanceHint ? (
                        <button
                          type="button"
                          onClick={() => focusGuidance("global")}
                          className="w-full inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <Lightbulb className="h-3.5 w-3.5" />
                          <span className="line-clamp-2 text-left">{guidanceHint.message}</span>
                        </button>
                      ) : null}
                    </aside>
                    <section className="space-y-6">
                      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-[#f8f5ef] via-white to-background p-6 shadow-sm">
                        <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground">Governing Thought</p>
                        <h2 className="mt-3 font-serif text-3xl leading-snug text-foreground">
                          {reportData.governingThought || storyData.heroInsight?.keyInsight || "Analysis in progress"}
                        </h2>
                        <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground tracking-[0.3em]">Primary Question</p>
                            <p className="text-foreground">{reportData.primaryQuestion || "Awaiting contract"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground tracking-[0.3em]">Success Criteria</p>
                            <p className="text-foreground">{reportData.successCriteria || "No explicit win condition"}</p>
                          </div>
                        </div>
                      </div>

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

                      {reportData.guidanceNotes?.length ? (
                        <GuidanceOverlay notes={reportData.guidanceNotes} context="global" />
                      ) : null}

                      <div className="rounded-3xl border border-border/40 bg-card/70 p-6 shadow-sm space-y-6">
                        <StoryHeadline data={storyData} onHighlight={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })} />
                        <div className="flex justify-center">
                          <StoryControlBar data={storyData} />
                        </div>
                        {!reportData.hasTimeField && reportData.profile?.columns ? (
                          <TimelineHelper profile={reportData.profile} runId={activeRun} initialColumn={reportData.syntheticTimeColumn} />
                        ) : null}
                        <CuratedKpiPanel
                          kpis={curatedKpis}
                          loading={kpiLoading && curatedKpis.length === 0}
                          sourceLabel={kpiSourceLabel}
                          onViewEvidence={handleEvidenceFocus}
                        />
                      </div>

                      {scqaModules.length ? (
                        <div className="space-y-4">
                          {scqaModules.map((module) => (
                            <div
                              key={module.id}
                              className="rounded-3xl border border-border/40 bg-card/80 p-5 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">SCQA Block</p>
                                <span className="text-xs text-muted-foreground">Priority {(module.importance * 100).toFixed(0)}%</span>
                              </div>
                              <h3 className="mt-2 font-serif text-2xl text-foreground">{module.title}</h3>
                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                {[
                                  { label: "Situation", value: module.scqa.situation },
                                  { label: "Complication", value: module.scqa.complication },
                                  { label: "Question", value: module.scqa.question },
                                  { label: "Answer", value: module.scqa.answer },
                                ].map((item) => (
                                  <div key={`${module.id}-${item.label}`} className="text-sm">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{item.label}</p>
                                    <p
                                      className={cn(
                                        "mt-1 text-foreground",
                                        item.label === "Answer"
                                          ? "font-serif text-xl"
                                          : "text-sm text-muted-foreground/90",
                                      )}
                                      style={item.label === "Answer" ? { color: "var(--action-color, #005eb8)" } : undefined}
                                    >
                                      {item.value || "Pending"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <TopDriversCard
                          data={reportData.enhancedAnalytics?.feature_importance}
                          safeMode={reportData.safeMode}
                          onViewEvidence={
                            reportData.enhancedAnalytics?.feature_importance || predictiveEvidenceId
                              ? () =>
                                  handleEvidenceFocus({
                                    section: "feature_importance",
                                    evidenceId:
                                      reportData.enhancedAnalytics?.feature_importance?.evidence_id ||
                                      predictiveEvidenceId,
                                  })
                              : undefined
                          }
                        />
                        <CorrelationInsightsCard
                          data={reportData.enhancedAnalytics?.correlation_analysis}
                          onViewEvidence={
                            reportData.enhancedAnalytics?.correlation_analysis && predictiveEvidenceId
                              ? () =>
                                  handleEvidenceFocus({
                                    section: "feature_importance",
                                    evidenceId: predictiveEvidenceId,
                                  })
                              : undefined
                          }
                        />
                      </div>

                      {reportData.personas && reportData.personas.length > 0 ? (
                        <div className="animate-fade-in-up delay-200 section-persona">
                          <PersonaDeck
                            personas={reportData.personas.map((p: any) => ({
                              id: p.name,
                              label: p.name,
                              description: p.description,
                              size: `${p.percentage?.toFixed(0) || 0}%`,
                              value: p.traits?.[0]
                            }))}
                            onViewEvidence={
                              clusteringEvidenceId
                                ? () =>
                                    handleEvidenceFocus({
                                      section: "business_intelligence",
                                      evidenceId: clusteringEvidenceId,
                                    })
                                : undefined
                            }
                          />
                        </div>
                      ) : null}

                      <div className="space-y-12">
                        {storyData.sections.map((section, idx) => {
                          if (section.type === "recommendation" && section.listItems && section.listItems.length > 0) {
                            return (
                              <ActionChecklist
                                key={idx}
                                title={section.title}
                                items={section.listItems}
                                onViewEvidence={
                                  businessEvidenceId
                                    ? () =>
                                        handleEvidenceFocus({
                                          section: "business_intelligence",
                                          evidenceId: businessEvidenceId,
                                        })
                                    : undefined
                                }
                              />
                            );
                          }

                          return (
                            <SentimentBlock
                              key={idx}
                              title={section.title}
                              sentiment={section.sentiment}
                              impact={section.impact}
                            >
                              <ReactMarkdown>{section.content}</ReactMarkdown>
                            </SentimentBlock>
                          );
                        })}
                      </div>
                    </section>
                    <aside className="space-y-5 xl:sticky xl:top-32 self-start">
                      <EvidenceRail
                        mode="inline"
                        data={reportData}
                        runId={activeRun}
                        onFocusGuidance={() => focusGuidance("global")}
                        simulationResult={simulationEvidence.result}
                        simulationModifications={simulationEvidence.modifications}
                      />
                      <SimulationControls
                        runId={activeRun}
                        availableColumns={numericColumns}
                        hint={guidanceHint ? guidanceHint.message : null}
                        onSimulationResult={handleSimulationReport}
                      />
                    </aside>
                  </div>
                )
              ) : (
                <section className="rounded-2xl border border-border/40 bg-card shadow-sm" style={{ maxHeight: "1080px" }}>
                  <div className="p-6 space-y-4 overflow-y-auto max-h-[1080px]">
                    <header className="space-y-2">
                      <p className="text-xs uppercase text-muted-foreground tracking-wide">Task Contract</p>
                      <h2 className="text-xl font-semibold">{reportData.primaryQuestion || "Analysis in Progress"}</h2>
                      {reportData.decisionSummary && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{reportData.decisionSummary}</p>
                      )}
                      {reportData.taskContractSummary && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line">{reportData.taskContractSummary}</p>
                      )}
                      {reportData.successCriteria && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 whitespace-pre-line">
                          <span className="font-semibold">Success Signal:</span> {reportData.successCriteria}
                        </p>
                      )}
                    </header>

                    <div className="space-y-4">
                      {prioritizedSections.primary.map((section, idx) => (
                        <InsightBlock
                          key={section.id || `primary-${idx}`}
                          narrativeText={section.content.split("\n").slice(0, 3).join(" ")}
                          evidenceObject={{
                            id: section.id || `section-${idx}`,
                            summary: section.title,
                          }}
                          viewMode={viewMode}
                          visualConfig={{
                            type: idx === 0 ? "spark" : "table",
                            title: viewMode === "story" ? translateTechnicalTerm(section.title) : section.title,
                            description: viewMode === "story" ? undefined : `Importance ${(section.importance * 100).toFixed(0)}%`,
                            confidence: reportData.confidenceValue,
                            render: () => (
                              <div className="text-sm text-muted-foreground line-clamp-6">
                                <ReactMarkdown>
                                  {section.content}
                                </ReactMarkdown>
                              </div>
                            ),
                          }}
                        />
                      ))}

                      {prioritizedSections.appendix.length > 0 && (
                        <Accordion type="single" collapsible>
                          <AccordionItem value="appendix">
                            <AccordionTrigger className="text-left">Appendices</AccordionTrigger>
                            <AccordionContent className="space-y-3">
                              {prioritizedSections.appendix.map((section, idx) => (
                                <InsightBlock
                                  key={section.id || `appendix-${idx}`}
                                  narrativeText={section.content.split("\n").slice(0, 2).join(" ")}
                                  evidenceObject={{ id: section.id || `appendix-${idx}`, summary: section.title }}
                                  viewMode={viewMode}
                                  visualConfig={{
                                    type: "table",
                                    title: viewMode === "story" ? translateTechnicalTerm(section.title) : section.title,
                                    description: "Auto-collapsed",
                                    confidence: reportData.confidenceValue,
                                    render: () => (
                                      <div className="text-xs text-muted-foreground line-clamp-4">
                                        <ReactMarkdown>
                                          {section.content}
                                        </ReactMarkdown>
                                      </div>
                                    ),
                                  }}
                                />
                              ))}
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </div>
                  </div>
                </section>
              )}

            </>
          )}
        </div>
      </main>



      {/* Strategy Simulator CTA */}
      {reportData.profile?.numericColumns?.length ? (
        <section className="py-12 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-y border-border/40">
          <div className="container px-4 max-w-4xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Deep Dive Strategy Lab</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8 text-lg">
              Want to run "What-If" scenarios? Enter the Lab to simulate market changes, adjust variables, and forecast business impact using the ACE Simulation Engine.
            </p>
            <Button size="lg" onClick={() => navigate(`/lab/${activeRun}`)} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Sparkles className="w-4 h-4" />
              Enter Strategy Lab
            </Button>
          </div>
        </section>
      ) : null}

      <AskAce reportData={reportData} />
      <Footer />
    </div>
  );
};

export default ExecutivePulse;
















