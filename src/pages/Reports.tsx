
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WideReportViewer } from "@/components/report/WideReportViewer";
import { PipelineStatus } from "@/components/report/PipelineStatus";
import { FileText, Plus, Search, AlertCircle } from "lucide-react";
import { getReport, API_BASE } from "@/lib/api-client";
import { getRecentReports, saveRecentReport, validateAndCleanRecentReports, removeRecentReport } from "@/lib/localStorage";


const Reports = () => {
  const [searchParams] = useSearchParams();
  const runFromUrl = searchParams.get("run");

  // If user navigates to /reports without ?run=, fall back to most recent run.
  const mostRecentRun = getRecentReports()[0]?.runId || "";
  const initialRunId = runFromUrl || mostRecentRun;

  const [runInput, setRunInput] = useState(initialRunId);
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const [hasValidated, setHasValidated] = useState(false);

  // Validate and clean localStorage on mount
  useEffect(() => {
    const cleanupInvalidRuns = async () => {
      await validateAndCleanRecentReports(API_BASE);
      setHasValidated(true);

      // If the initial run ID was cleaned, clear it
      if (initialRunId) {
        const updatedRecent = getRecentReports();
        const stillExists = updatedRecent.some(r => r.runId === initialRunId);
        if (!stillExists) {
          setActiveRunId("");
          setRunInput("");
        }
      }
    };
    cleanupInvalidRuns();
  }, []);

  useEffect(() => {
    if (runFromUrl) {
      setRunInput(runFromUrl);
      setActiveRunId(runFromUrl);
    }
  }, [runFromUrl]);

  const [lastKnownContent, setLastKnownContent] = useState<string | undefined>();
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

  const reportQuery = useQuery<string | undefined>({
    queryKey: ["final-report", activeRunId],
    queryFn: () => getReport(activeRunId),
    enabled: Boolean(activeRunId),
    retry: 3,
    retryDelay: 2000,
    refetchInterval: (query) => {
      // Keep polling every 3s if we got a 404 (report not ready yet)
      const error = query.state.error;
      if (error && error instanceof Error && error.message.includes("404")) {
        return 3000;
      }
      return false;
    },
  });

  const isReportNotReady =
    reportQuery.isError &&
    reportQuery.error instanceof Error &&
    reportQuery.error.message.includes("404");

  // Preserve content during background refetches
  useEffect(() => {
    if (reportQuery.data) {
      setLastKnownContent(reportQuery.data);
      setIsPipelineRunning(false);
    }
  }, [reportQuery.data]);

  // Track pipeline state
  useEffect(() => {
    if (isReportNotReady) {
      setIsPipelineRunning(true);
    }
  }, [isReportNotReady]);

  // Clear content when changing run IDs
  useEffect(() => {
    setLastKnownContent(undefined);
    setIsPipelineRunning(false);
  }, [activeRunId]);

  useEffect(() => {
    if (activeRunId) saveRecentReport(activeRunId, `Report ${activeRunId.substring(0, 8)}`);
  }, [activeRunId]);

  const handleLoadReport = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    setActiveRunId(sanitized);
  };

  const handlePipelineComplete = () => {
    reportQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Reports Center</h1>
              <p className="text-muted-foreground mt-1">
                Access generated intelligence reports and historical analytics.
              </p>
            </div>
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          </div>

          <div className="space-y-8">
            {/* Report Viewer Section */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    Report Viewer
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter a valid Run ID to fetch and view the full markdown report from the ACE Engine.
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Input
                    placeholder="Paste Run ID here..."
                    value={runInput}
                    onChange={(e) => setRunInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleLoadReport} disabled={!runInput.trim()}>
                    Load
                  </Button>
                </div>
              </div>

              {activeRunId && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                  <span>Viewing report for Run:</span>
                  <code className="bg-background px-1 py-0.5 rounded border font-mono text-xs">{activeRunId}</code>
                </div>
              )}

              {/* Show clear error message for non-404 errors */}
              {reportQuery.isError && !isReportNotReady && (
                <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium mb-1">Error loading report</p>
                      <p className="text-sm">{reportQuery.error instanceof Error ? reportQuery.error.message : "Report not found or API error."}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          removeRecentReport(activeRunId);
                          setActiveRunId("");
                          setRunInput("");
                        }}
                      >
                        Clear and Start Fresh
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="min-h-[400px]">
                {/* Show pipeline status ONLY when report is not ready AND we don't have content yet */}
                {isPipelineRunning && !lastKnownContent && (
                  <div className="mb-4">
                    <PipelineStatus runId={activeRunId} onComplete={handlePipelineComplete} />
                  </div>
                )}

                {/* Show report viewer when we have content OR when initial loading */}
                {(lastKnownContent || (!isPipelineRunning && reportQuery.isFetching)) && (
                  <WideReportViewer
                    content={lastKnownContent}
                    isLoading={!lastKnownContent && reportQuery.isFetching}
                    runId={activeRunId}
                  />
                )}

                {/* Empty state - only show when no run ID selected */}
                {!activeRunId && !lastKnownContent && !reportQuery.isFetching && (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p>Enter a Run ID above to view the wide premium report layout.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;
