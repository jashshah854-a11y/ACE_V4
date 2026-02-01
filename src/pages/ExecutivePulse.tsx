
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { StoryHeadline } from "@/components/report/story/StoryHeadline";
import { SentimentBlock } from "@/components/report/story/SentimentBlock";
import { ActionChecklist } from "@/components/report/story/ActionChecklist";
import { StoryControlBar } from "@/components/report/story/StoryControlBar";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Sparkles,
  BarChart3,
  Shield,
  Users,
  Loader2
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { getRunSnapshot } from "@/lib/api-client";
import { focusEvidenceSection } from "@/lib/guidanceFocus";
import { getRecentReports } from "@/lib/localStorage";
import { useReportData } from "@/hooks/useReportData";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { TopDriversCard } from "@/components/report/analytics/TopDriversCard";
import { CorrelationInsightsCard } from "@/components/report/analytics/CorrelationInsightsCard";
import { RedundancyReportCard } from "@/components/report/analytics/RedundancyReportCard";
import { useTaskContext } from "@/context/TaskContext";
import { ExecutiveKpiGrid } from "@/components/report/ExecutiveKpiGrid"; // New Component
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { RunWarningsBanner } from "@/components/report/RunWarningsBanner";
import { isValidArtifact } from "@/lib/artifactGuard";
import { TableOfContents } from "@/components/report/navigation/TableOfContents";
import { TrustSummary } from "@/components/trust/TrustSummary";
import { useDevReportInvariants } from "@/hooks/useDevReportInvariants";
import { RestaurantRiskDashboard } from "@/components/report/business/RestaurantRiskDashboard";
import { MarketingRiskDashboard } from "@/components/report/business/MarketingRiskDashboard";
import { MarketingSimulationCard } from "@/components/report/business/MarketingSimulationCard";
import { MobileTocDrawer } from "@/components/report/navigation/MobileTocDrawer";

const ExecutivePulse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [recentReports, setRecentReports] = useState(() => getRecentReports());
  const initialRun = searchParams.get("run") || recentReports[0]?.runId || "";
  const [activeRun, setActiveRun] = useState(initialRun);

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

  // --- Queries ---
  const snapshotQuery = useQuery({
    queryKey: ["run-snapshot", activeRun],
    queryFn: () => getRunSnapshot(activeRun),
    enabled: Boolean(activeRun),
    staleTime: 30000,
    retry: false,
  });

  const reportData = useReportData(
    snapshotQuery.data?.report_markdown || "",
    activeRun,
    "strict",
    snapshotQuery.data?.governed_report,
    snapshotQuery.data
  );
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

  const handleEvidenceFocus = useCallback(
    ({ section, evidenceId }: { section: string; evidenceId?: string }) => {
      const scopedEvidence = evidenceId ?? evidenceScopeMap[section];
      focusEvidenceSection(section, scopedEvidence ? { evidenceId: scopedEvidence } : {});
    },
    [evidenceScopeMap],
  );

  const businessEvidenceId = evidenceScopeMap["business_intelligence"];
  const predictiveEvidenceId = evidenceScopeMap["feature_importance"];
  const clusteringEvidenceId = evidenceScopeMap["clustering"];
  const importanceReport = reportData.modelArtifacts?.importance_report;
  const modelFitReport = reportData.modelArtifacts?.model_fit_report;
  const collinearityReport = reportData.modelArtifacts?.collinearity_report;
  const businessIntelligence = reportData.enhancedAnalytics?.business_intelligence;
  const restaurantRisk = businessIntelligence?.restaurant_risk;
  const marketingRisk = businessIntelligence?.marketing_risk;
  const marketingSimulation = businessIntelligence?.marketing_simulation;
  const allowBusinessIntelligence = reportData.renderPolicy?.allow_business_intelligence === true;
  const showRestaurantRisk = allowBusinessIntelligence && Boolean(restaurantRisk?.available);
  const showMarketingRisk = allowBusinessIntelligence && Boolean(marketingRisk?.available);
  const showMarketingSimulation =
    allowBusinessIntelligence && isValidArtifact(businessIntelligence) && Boolean(marketingSimulation?.available);

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
  const scopeLocks = reportData.scopeLocks || [];
  const profileMeta = (reportData.profile ?? {}) as Record<string, any>;
  const identityRows = typeof reportData.identityStats?.rows === "number"
    ? reportData.identityStats.rows.toLocaleString()
    : reportData.identityStats?.rows || "n/a";
  const columnCount = profileMeta.column_count ?? profileMeta.columnCount ?? (reportData.profile?.columns ? Object.keys(reportData.profile.columns).length : undefined);
  const dataClarityPercent = Math.round(reportData.dataQualityValue || 0);
  const hasData = activeRun && snapshotQuery.data;
  const trustScore = reportData.trustModel?.overall_confidence;
  const lowTrust = typeof trustScore === "number" && trustScore < 60;
  const narrativeMode = "executive";
  const executiveBrief = lowTrust
    ? ["Executive summary withheld until reliability improves. Review diagnostics for constraints."]
    : storyData.executiveBrief;
  const storyDataForBrief = { ...storyData, executiveBrief };
  const summarizedContent = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const first = lines[0] || content;
    return first.length > 240 ? `${first.slice(0, 237)}...` : first;
  };

  const contentForMode = (content: string, isRecommendation?: boolean) => {
    return summarizedContent(applyTrustTone(content, isRecommendation));
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

  const regressionReady = reportData.renderPolicy?.allow_regression_sections === true;
  const actionSections = storyData.sections.filter(
    (section) => section.type === "recommendation" && section.listItems?.length,
  );
  const viewPolicies = reportData.viewPolicies;
  const activePolicy = viewPolicies?.[narrativeMode];
  const allowedSections = new Set(activePolicy?.allowed_sections || []);
  const sectionAllowed = (id: string) => !activePolicy || allowedSections.has(id);
  const showGoverningThought = sectionAllowed("governing_thought") &&
    Boolean(reportData.governingThought || storyData.heroInsight?.keyInsight);
  const showKeyMetrics = sectionAllowed("key_metrics") && executiveMetrics.length > 0;
  const showActionItems = sectionAllowed("action_items") && actionSections.length > 0;
  const redundancyReport = reportData.enhancedAnalytics?.redundancy_report;
  const showSupportingEvidence = sectionAllowed("supporting_evidence") && Boolean(
    storyData.sections.length ||
    isValidArtifact(reportData.enhancedAnalytics?.correlation_analysis) ||
    isValidArtifact(redundancyReport) ||
    (regressionReady && isValidArtifact(importanceReport)) ||
    showRestaurantRisk ||
    showMarketingRisk ||
    showMarketingSimulation,
  );
  const showTrustSummary = sectionAllowed("trust_summary") && reportData.renderPolicy?.allow_trust_summary === true;
  const showTools = false;
  const tocItems = [
    { id: "governing-thought", label: "Governing Thought", visible: showGoverningThought },
    { id: "key-metrics", label: "Key Metrics", visible: showKeyMetrics },
    { id: "action-items", label: "Prioritized Actions", visible: showActionItems },
    { id: "supporting-evidence", label: "Analysis & Evidence", visible: showSupportingEvidence },
  ].filter((item) => item.visible);

  const renderedSectionIds = [
    showGoverningThought ? "governing_thought" : null,
    showKeyMetrics ? "key_metrics" : null,
    showActionItems ? "action_items" : null,
    showSupportingEvidence ? "supporting_evidence" : null,
    showTrustSummary ? "trust_summary" : null,
    showTools ? "tools" : null,
  ].filter(Boolean) as string[];

  useDevReportInvariants({
    rootSelector: "[data-report-root]",
    tocItems,
    renderedSectionIds,
    viewPolicy: activePolicy || null,
    maxPrimarySections: 7,
  });

  if (snapshotQuery.isLoading || reportData.manifestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading run manifest...</p>
        </div>
      </div>
    );
  }

  if (snapshotQuery.error || !snapshotQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <Shield className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-2">Snapshot Unavailable</h1>
          <p className="text-sm text-muted-foreground">
            This report requires a run snapshot. Please refresh or rerun the analysis.
          </p>
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
    <div className="min-h-screen bg-background" data-report-root>
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
              <p className="text-muted-foreground">Strategic intelligence readout.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center" />
          </div>

          {!hasData ? (
            <EmptyState />
          ) : (
            <div className="animate-in fade-in duration-500">
              <RunWarningsBanner warnings={reportData.runWarnings} className="mb-6" />
              {showTrustSummary ? <TrustSummary trust={reportData.trustModel} className="mb-6" /> : null}

              {/* Mobile TOC Drawer - visible on small screens */}
              <MobileTocDrawer items={tocItems} />

              {/* 2-Column Layout: Nav | Content */}
              <div className="grid gap-6 lg:gap-10 grid-cols-1 xl:grid-cols-[220px_1fr] items-start">

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
                      <CollapsibleSection
                        title="Supporting Analysis & Evidence"
                        subtitle="Drivers, correlations, and narrative context"
                        defaultOpen={!activePolicy?.default_collapsed_sections?.includes("supporting_evidence")}
                      >
                        <div className="space-y-8 pt-4">
                          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-sm">
                            <StoryHeadline data={storyDataForBrief} onHighlight={() => handleEvidenceFocus({ section: "business_intelligence", evidenceId: businessEvidenceId })} />
                            <div className="mt-8 flex justify-center">
                              <StoryControlBar data={storyDataForBrief} />
                            </div>
                          </div>

                          <div className="grid gap-6 md:grid-cols-2">
                            {regressionReady && importanceReport ? (
                              <TopDriversCard
                                importanceReport={importanceReport}
                                modelFitReport={modelFitReport}
                                collinearityReport={collinearityReport}
                                safeMode={reportData.safeMode}
                                onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                              />
                            ) : null}
                            <CorrelationInsightsCard
                              data={reportData.enhancedAnalytics?.correlation_analysis}
                              correlationCi={reportData.enhancedAnalytics?.correlation_ci}
                              onViewEvidence={() => handleEvidenceFocus({ section: "feature_importance", evidenceId: predictiveEvidenceId })}
                            />
                          </div>

                          <RedundancyReportCard data={redundancyReport} />

                          {showRestaurantRisk ? (
                            <RestaurantRiskDashboard data={restaurantRisk} />
                          ) : null}

                          {showMarketingRisk ? (
                            <MarketingRiskDashboard data={marketingRisk} />
                          ) : null}

                          {showMarketingSimulation ? (
                            <MarketingSimulationCard data={marketingSimulation} />
                          ) : null}

                          {storyData.sections.filter(s => s.type !== "recommendation").map((section, idx) => (
                            <SentimentBlock
                              key={`narrative-${idx}`}
                              title={section.title}
                              sentiment={section.sentiment}
                              impact={section.impact}
                            >
                              <ReactMarkdown>{contentForMode(section.content, section.type === "recommendation")}</ReactMarkdown>
                            </SentimentBlock>
                          ))}
                        </div>
                      </CollapsibleSection>
                    </section>
                  )}
                </div>


              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ExecutivePulse;
