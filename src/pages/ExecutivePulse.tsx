import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
import { ConfidenceBadge } from "@/components/report/ConfidenceBadge";
import { LimitationBanner } from "@/components/report/LimitationBanner";

const ExecutivePulse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialRun = searchParams.get("run") || getRecentReports()[0]?.runId || "";
  const [runInput, setRunInput] = useState(initialRun);
  const [activeRun, setActiveRun] = useState(initialRun);

  const reportQuery = useQuery({
    queryKey: ["executive-pulse", activeRun],
    queryFn: () => getReport(activeRun),
    enabled: Boolean(activeRun),
    staleTime: 30000,
  });

  const { data: governedReport } = useGovernedReport(activeRun);
  const reportData = useReportData(reportQuery.data || "", activeRun, "strict", governedReport);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container px-4 max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Executive Pulse</h1>
              <p className="text-muted-foreground text-sm">High-density readout constrained to a single screen.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="Run ID"
                className="font-mono text-sm"
              />
              <Button onClick={handleSwitchRun} disabled={!runInput.trim()}>Load</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="text-muted-foreground">Run: {activeRun || "n/a"}</div>
            <ConfidenceBadge value={reportData.confidenceValue} label="Report" />
            <ConfidenceBadge value={reportData.dataQualityValue} label="Quality" />
          </div>

          {missingFields?.length ? (
            <LimitationBanner
              message="Dataset identity card reports missing columns. Lower-tier insights are collapsed automatically."
              fields={missingFields}
            />
          ) : null}

          <section className="rounded-2xl border bg-card shadow-sm" style={{ maxHeight: "1080px" }}>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[1080px]">
              <header className="space-y-2">
                <p className="text-xs uppercase text-muted-foreground">Task Contract</p>
                <h2 className="text-xl font-semibold">{reportData.primaryQuestion || "Primary decision pending"}</h2>
                {reportData.decisionSummary && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{reportData.decisionSummary}</p>
                )}
                {reportData.taskContractSummary && (
                  <p className="text-xs text-muted-foreground whitespace-pre-line">{reportData.taskContractSummary}</p>
                )}
              </header>

              {prioritizedSections.primary.length === 0 && (
                <div className="text-sm text-muted-foreground">No prioritized insights extracted.</div>
              )}

              {prioritizedSections.primary.map((section, idx) => (
                <InsightBlock
                  key={section.id || `primary-${idx}`}
                  narrativeText={section.content.split("\n").slice(0, 3).join(" ")}
                  evidenceObject={{
                    id: section.id || `section-${idx}`,
                    summary: section.title,
                  }}
                  visualConfig={{
                    type: idx === 0 ? "spark" : "table",
                    title: section.title,
                    description: `Importance ${(section.importance * 100).toFixed(0)}%`,
                    confidence: reportData.confidenceValue,
                    render: () => (
                      <ReactMarkdown className="text-sm text-muted-foreground line-clamp-6">
                        {section.content}
                      </ReactMarkdown>
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
                          visualConfig={{
                            type: "table",
                            title: section.title,
                            description: "Auto-collapsed",
                            confidence: reportData.confidenceValue,
                            render: () => (
                              <ReactMarkdown className="text-xs text-muted-foreground line-clamp-4">
                                {section.content}
                              </ReactMarkdown>
                            ),
                          }}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ExecutivePulse;
