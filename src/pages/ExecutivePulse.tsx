
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StoryHeadline } from "@/components/report/story/StoryHeadline";
import { SentimentBlock } from "@/components/report/story/SentimentBlock";
import { ActionChecklist } from "@/components/report/story/ActionChecklist";
import { PersonaDeck } from "@/components/report/story/PersonaDeck";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getReport } from "@/lib/api-client";
import type { SimulationResult, Modification } from "@/lib/api-client";
import { getRecentReports, getDiagnosticsCache, extractDiagnosticsNotes } from "@/lib/localStorage";
import { useReportData } from "@/hooks/useReportData";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { TopDriversCard } from "@/components/report/analytics/TopDriversCard";
import { CorrelationInsightsCard } from "@/components/report/analytics/CorrelationInsightsCard";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";
import EvidenceRail from "@/components/report/EvidenceRail";
import SimulationControls from "@/components/report/SimulationControls";
import { focusEvidenceSection } from "@/lib/guidanceFocus";
import { useTaskContext } from "@/context/TaskContext";
import { ExecutiveKpiGrid } from "@/components/report/ExecutiveKpiGrid"; // New Component
import { NarrativeModeSelector } from "@/components/narrative/NarrativeModeSelector";
import { useNarrative } from "@/components/narrative/NarrativeContext";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { RunWarningsBanner } from "@/components/report/RunWarningsBanner";
import { isValidArtifact } from "@/lib/artifactGuard";
import { TableOfContents } from "@/components/report/navigation/TableOfContents";
import { TrustSummary } from "@/components/trust/TrustSummary";

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
  const trustScore = reportData.trustModel?.overall_confidence;
  const lowTrust = typeof trustScore === "number" && trustScore < 60;
  const executiveBrief = lowTrust
    ? ["Executive summary withheld until reliability improves. Review diagnostics for constraints."]
    : storyData.executiveBrief;
  const storyDataForBrief = { ...storyData, executiveBrief };
  const summarizedContent = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const first = lines[0] || content;
    return first.length > 240 ? `${first.slice(0, 237)}...` : first;
  };

  const contentForMode = (content: string, impact?: string, isRecommendation?: boolean) => {
    if (narrativeMode === "executive") {
      return summarizedContent(applyTrustTone(content, isRecommendation));
    }
    if (narrativeMode === "expert" && impact) {
      return `${applyTrustTone(content, isRecommendation)}\n\nAssumptions & caveats: ${impact}`;
    }
    return applyTrustTone(content, isRecommendation);
  };

  const applyTrustTone = (content: string, isRecommendation?: boolean) => {
    if (typeof trustScore !== "number") {
      return `Exploratory: ${content}`;
    }
    if (trustScore < 60 && isRecommendation) {
      return `Limited reliability: recommendation is exploratory. ${content}`;
    }
    if (trustScore < 60) {
      return `Based on available evidence, this is exploratory. ${content}`;
    }
    if (trustScore < 80) {
      return `Strong signal with caveats. ${content}`;
    }
    return content;
  };

  if (reportQuery.isLoading || reportData.manifestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading run manifest...</p>
        </div>
      </div>
    );
  }

  if (!reportData.manifestCompatible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Shield className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Manifest Incompatible</h1>
          <p className="text-sm text-muted-foreground">
            This report was generated with an unsupported manifest version. Please refresh after updating.
          </p>
        </div>
      </div>
    );
  }

  if (reportData.renderPolicy && !reportData.renderPolicy.allow_report) {
    return null;
  }

  // --- New KPI Grid Data ---
  const executiveMetrics = [
    {
      label: "Total Rows",
      value: identityRows,
      icon: Users,
      tooltip: "Number of records successfully parsed and available for analysis."
    },
    {
      label: "Fields",
      value: columnCount || "Scanning...",
      unit: "columns",
      icon: BarChart3,
      tooltip: "Number of distinct data columns identified in the dataset."
    },
    {
      label: "Data Quality",
      value: dataClarityPercent,
      unit: "%",
      icon: Shield,
      className: dataClarityPercent > 80 ? "border-emerald-600/30" : "border-amber-500/30",
      tooltip: "Proprietary quality score based on completeness, consistency, and format validity."
    },
  ];

  const regressionReady = reportData.diagnostics?.regression_status === "success";
  const actionSections = storyData.sections.filter(
    (section) => section.type === "recommendation" && section.listItems?.length,
  );
  const showGoverningThought = Boolean(reportData.governingThought || storyData.heroInsight?.keyInsight);
  const showKeyMetrics = executiveMetrics.length > 0;
  const showActionItems = actionSections.length > 0;
  const showSupportingEvidence = Boolean(
    storyData.sections.length ||
      isValidArtifact(reportData.enhancedAnalytics?.correlation_analysis) ||
      (regressionReady && isValidArtifact(reportData.enhancedAnalytics?.feature_importance)),
  );
  const tocItems = [
    { id: "governing-thought", label: "Governing Thought", visible: showGoverningThought },
    { id: "key-metrics", label: "Key Metrics", visible: showKeyMetrics },
    { id: "action-items", label: "Prioritized Actions", visible: showActionItems },
    { id: "supporting-evidence", label: "Analysis & Evidence", visible: showSupportingEvidence },
  ].filter((item) => item.visible);


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
            </div>
          </div>

          {!hasData ? (
            <EmptyState />
          ) : (
            <div className="animate-in fade-in duration-500">
              <RunWarningsBanner warnings={reportData.runWarnings} className="mb-6" />
              <TrustSummary trust={reportData.trustModel} className="mb-6" />
              {/* 3-Column Layout: Nav | Content | Context */}
              <div className="grid gap-6 lg:gap-10 grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[220px_1fr_340px] items-start">

                {/* Left Rail: Navigation (Visible on XL+) */}
                <aside className="hidden xl:block sticky top-24 self-start space-y-6">
                  <TableOfContents
                    items={tocItems}
                    className="pr-4 border-r border-border/40"
                  />

                  {/* Scope Locks moved to Left Rail to declutter Right Rail */}
                  {scopeLocks.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Active Constraints</div>
                      <div className="flex flex-wrap gap-1.5">
                        {scopeLocks.map((lock, idx) => (
                          <span key={idx} className="bg-background px-1.5 py-0.5 rounded text-[10px] border border-border text-foreground shadow-sm">
                            {lock.dimension}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>

                {/* Middle Column: Narrative & Insights */}
                <div className="space-y-10 min-w-0">
                  {/* 1. Governing Thought Section - ALWAYS FIRST */}
                  {showGoverningThought && (
                    <section id="governing-thought" className="space-y-6 scroll-mt-24">
                      <ExplanationBlock {...getSectionCopy("governing_thought")} />

                      {/* Hero Insight Card */}
                      <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-card to-background p-8 lg:p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Sparkles className="w-24 h-24" />
                        </div>

                        <div className="flex items-center gap-3 mb-6 relative">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Governing Thought</span>
                        </div>

                        <div className="relative z-10 space-y-4">
                          <h2 className="font-serif text-3xl md:text-5xl leading-tight text-foreground font-medium text-balance">
                            {reportData.governingThought || storyData.heroInsight?.keyInsight || "Analyzing strategic implications..."}
                          </h2>
                          <p className="text-xl text-muted-foreground leading-relaxed font-light text-balance max-w-2xl">
                            {reportData.primaryQuestion ? `Addressing: "${reportData.primaryQuestion}"` : "No primary question defined for this analysis."}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 2. Key Metrics Summary - Evidence for thesis */}
                  {showKeyMetrics && (
                    <section id="key-metrics" className="scroll-mt-24">
                      <ExecutiveKpiGrid metrics={executiveMetrics} />
                    </section>
                  )}

                  {/* 3. Action Items - PRIORITIZED for Executives */}
                  {showActionItems && (
                    <section id="action-items" className="scroll-mt-24 space-y-6">
                      {actionSections.map((section, idx) => {
                      const items = narrativeMode === "executive"
                        ? section.listItems.slice(0, 3)
                        : section.listItems;
                      return (
                        <ActionChecklist
                          key={`action-${idx}`}
                          title={section.title}
                          items={items}
                          onViewEvidence={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })}
                        />
                      );
                      })}
                    </section>
                  )}

                  {/* 4. Supporting Evidence - Progressive Disclosure */}
                  {showSupportingEvidence && (
                  <section id="supporting-evidence" className="scroll-mt-24">
                    {narrativeMode === "executive" ? (
                      <CollapsibleSection
                        title="View Supporting Analysis & Evidence"
                        subtitle="Detailed narrative, drivers, and correlations"
                        defaultOpen={false}
                      >
                        <div className="space-y-8 pt-4">
                          {/* Headline & Evidence Link */}
                          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
                            <StoryHeadline data={storyDataForBrief} onHighlight={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })} />
                            <div className="mt-8 flex justify-center">
                              <StoryControlBar data={storyDataForBrief} />
                            </div>
                          </div>

                          {/* Interactive Charts */}
                          <div className="grid gap-6 md:grid-cols-2">
                          {regressionReady && reportData.enhancedAnalytics?.feature_importance ? (
                              <TopDriversCard
                                data={reportData.enhancedAnalytics?.feature_importance}
                                safeMode={reportData.safeMode}
                                onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                              />
                            ) : null}
                            <CorrelationInsightsCard
                              data={reportData.enhancedAnalytics?.correlation_analysis}
                              onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                            />
                          </div>

                          {/* Narrative Blocks */}
                          {storyData.sections.filter(s => s.type !== "recommendation").map((section, idx) => (
                            <SentimentBlock
                              key={`narrative-${idx}`}
                              title={section.title}
                              sentiment={section.sentiment}
                              impact={section.impact}
                            >
                              <ReactMarkdown>{contentForMode(section.content, section.impact, section.type === "recommendation")}</ReactMarkdown>
                            </SentimentBlock>
                          ))}
                        </div>
                      </CollapsibleSection>
                    ) : (
                      // Analyst Mode: Everything expanded
                      <div className="space-y-12">
                        {/* Headline */}
                        <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
                          <StoryHeadline data={storyDataForBrief} onHighlight={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })} />
                          <div className="mt-8 flex justify-center">
                            <StoryControlBar data={storyDataForBrief} />
                          </div>
                        </div>

                        {/* Charts */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {regressionReady && reportData.enhancedAnalytics?.feature_importance ? (
                            <TopDriversCard
                              data={reportData.enhancedAnalytics?.feature_importance}
                              safeMode={reportData.safeMode}
                              onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                            />
                          ) : null}
                          <CorrelationInsightsCard
                            data={reportData.enhancedAnalytics?.correlation_analysis}
                            onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                          />
                        </div>

                        {/* All Narratives */}
                        {storyData.sections.map((section, idx) => {
                          if (section.type === "recommendation" && section.listItems?.length) {
                            const items = narrativeMode === "executive"
                              ? section.listItems.slice(0, 3)
                              : section.listItems;
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
                            >
                              <ReactMarkdown>{contentForMode(section.content, section.impact, section.type === "recommendation")}</ReactMarkdown>
                            </SentimentBlock>
                          );
                        })}
                      </div>
                    )}
                  </section>
                  )}
                </div>

                {/* Right Column: Lab & Controls */}
                <aside className="space-y-6 lg:sticky lg:top-24 self-start h-fit">
                  <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border/40 bg-muted/20">
                      <h3 className="text-sm font-semibold">Run Controls</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="relative">
                        <Input
                          value={runInput}
                          onChange={(e) => setRunInput(e.target.value)}
                          placeholder="Run ID"
                          className="font-mono text-sm w-full pl-8"
                          onKeyDown={(e) => e.key === "Enter" && handleSwitchRun()}
                        />
                        <FileText className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                      </div>
                      <Button onClick={handleSwitchRun} disabled={!runInput.trim()} className="w-full">
                        Load Run
                      </Button>
                    </div>
                  </div>

                  {/* Lab Controls */}
                  {numericColumns.length > 0 ? (
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
                  ) : (
                    <div className="rounded-2xl border border-border/40 bg-muted/30 p-5 text-center">
                      <Zap className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground font-medium mb-1">Strategy Lab Unavailable</p>
                      <p className="text-xs text-muted-foreground/70">Requires numeric fields for simulation</p>
                    </div>
                  )}

                  {/* Evidence Rail */}
                  <EvidenceRail
                    mode="inline"
                    data={reportData}
                    runId={activeRun}
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
