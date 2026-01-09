import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { transformToStory } from "@/lib/reportViewModel";
import { StoryHeadline } from "@/components/report/story/StoryHeadline";
import { MetricCardGrid } from "@/components/report/story/MetricCardGrid";
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
  Zap
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getReport } from "@/lib/api-client";
import { getRecentReports } from "@/lib/localStorage";
import { useReportData } from "@/hooks/useReportData";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { InsightBlock } from "@/components/report/InsightBlock";
import { SignalWidget } from "@/components/trust/SignalWidget";
import { LimitationBanner } from "@/components/report/LimitationBanner";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";
import { translateTechnicalTerm } from "@/lib/dataTypeMapping";
import SimulationControls from "@/components/report/SimulationControls";

const ExecutivePulse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recentReports = getRecentReports();
  const initialRun = searchParams.get("run") || recentReports[0]?.runId || "";
  const [runInput, setRunInput] = useState(initialRun);
  const [activeRun, setActiveRun] = useState(initialRun);
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
  const { setSafeMode } = useSimulation();

  // Sync Safe Mode state
  useEffect(() => {
    setSafeMode(reportData.safeMode);
  }, [reportData.safeMode, setSafeMode]);

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
  useEffect(() => {
    if (recentReports.length === 0 && !searchParams.get("run")) {
      navigate("/upload");
    }
  }, [recentReports.length, searchParams, navigate]);


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
                        <span>•</span>
                        <span className="truncate">{report.createdAt}</span>
                      </>
                    )}
                  </div>
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

                {/* View Toggles */}
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

                {/* Metadata Chips - Simplified in Story Mode */}
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

              {/* Main Content */}
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
                  </header>

                  {viewMode === "story" ? (
                    reportQuery.isLoading ? (
                      <StorySkeleton />
                    ) : (
                      <div className="max-w-3xl mx-auto animate-fade-in-up">
                        {/* NEW: Story Header & Metrics */}
                        <StoryHeadline data={transformToStory(reportData)} />

                        {/* New: Advanced Controls */}
                        <div className="flex justify-center mb-8">
                          <StoryControlBar data={transformToStory(reportData)} />
                        </div>

                        <MetricCardGrid metrics={transformToStory(reportData).metricCards} />

                        {/* NEW: Persona Deck (Horizontal Scroll) */}
                        {reportData.personas && reportData.personas.length > 0 && (
                          <div className="animate-fade-in-up delay-200 section-persona">
                            <PersonaDeck
                              personas={reportData.personas.map((p: any) => ({
                                id: p.name,
                                label: p.name,
                                description: p.description,
                                size: `${p.percentage?.toFixed(0) || 0}%`,
                                value: p.traits?.[0]
                              }))}
                            />
                          </div>
                        )}

                        {/* NEW: Editorial Section Loop */}
                        <div className="space-y-12">
                          {transformToStory(reportData).sections.map((section, idx) => {
                            if (section.type === "recommendation" && section.listItems && section.listItems.length > 0) {
                              return (
                                <ActionChecklist
                                  key={idx}
                                  title={section.title}
                                  items={section.listItems}
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
                      </div>
                    )) : (
                    // Technical View (Original)
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
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Strategy Simulator CTA */}
      {reportData && reportData.profile?.columns && (
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
      )}

      <AskAce reportData={reportData} />
      <Footer />
    </div>
  );
};

export default ExecutivePulse;
