
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WideReportViewer } from "@/components/report/WideReportViewer";
import { PipelineStatus } from "@/components/report/PipelineStatus";
import { FileText, Plus, Search, Activity } from "lucide-react";
import { getReport, listRuns, RunsResponse, RunDetails } from "@/lib/api-client";
import { getRecentReports, saveRecentReport } from "@/lib/localStorage";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";


const Reports = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const runFromUrl = searchParams.get("run");

  // If user navigates to /reports without ?run=, fall back to most recent run.
  const mostRecentRun = getRecentReports()[0]?.runId || "";
  const initialRunId = runFromUrl || mostRecentRun;

  const [runInput, setRunInput] = useState(initialRunId);
  const [activeRunId, setActiveRunId] = useState(initialRunId);

  useEffect(() => {
    if (runFromUrl) {
      setRunInput(runFromUrl);
      setActiveRunId(runFromUrl);
    }
  }, [runFromUrl]);

  const [lastKnownContent, setLastKnownContent] = useState<string | undefined>();
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [connectorFilter, setConnectorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastStatusNotified, setLastStatusNotified] = useState<string | undefined>();

  const runsQuery = useQuery<RunsResponse>({
    queryKey: ["runs"],
    queryFn: () => listRuns(40),
    refetchInterval: 30000,
  });

  const runDetails = runsQuery.data?.run_details ?? [];
  const connectorOptions = useMemo(() => {
    const values = new Set<string>();
    runDetails.forEach((detail) => {
      const key = (detail.source?.connector || "manual").toLowerCase();
      values.add(key);
    });
    return Array.from(values).sort();
  }, [runDetails]);

  const statusOptions = useMemo(() => {
    const values = new Set<string>();
    runDetails.forEach((detail) => {
      if (detail.status) values.add(detail.status.toString().toLowerCase());
    });
    return Array.from(values).sort();
  }, [runDetails]);

  const filteredRunDetails = useMemo(() => {
    return runDetails.filter((detail) => {
      const connectorKey = (detail.source?.connector || "manual").toLowerCase();
      const statusKey = detail.status ? detail.status.toString().toLowerCase() : "";
      if (connectorFilter !== "all" && connectorKey !== connectorFilter) return false;
      if (statusFilter !== "all" && statusKey !== statusFilter) return false;
      return true;
    });
  }, [runDetails, connectorFilter, statusFilter]);

  const connectorsSummary = useMemo(() => {
    const map = new Map<string, { name: string; lastRun?: string; lastStatus?: string; failures: number; total: number }>();
    runDetails.forEach((detail) => {
      const key = (detail.source?.connector || "manual").toLowerCase();
      const summary = map.get(key) || { name: key, failures: 0, total: 0 };
      summary.total += 1;
      const status = detail.status ? detail.status.toString() : undefined;
      if (status && status.toLowerCase().includes("fail")) {
        summary.failures += 1;
      }
      if (!summary.lastRun || (detail.created_at && new Date(detail.created_at) > new Date(summary.lastRun))) {
        summary.lastRun = detail.created_at;
        summary.lastStatus = status;
      }
      map.set(key, summary);
    });
    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.lastRun ? new Date(a.lastRun).getTime() : 0;
      const dateB = b.lastRun ? new Date(b.lastRun).getTime() : 0;
      return dateB - dateA;
    });
  }, [runDetails]);

  const activeRunDetail = useMemo(
    () => runDetails.find((detail) => detail.run_id === activeRunId),
    [runDetails, activeRunId]
  );

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
    setLastStatusNotified(undefined);
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

  const handlePipelineStatusChange = (status?: string) => {
    if (!status || !activeRunId) return;
    if (lastStatusNotified === status) return;
    setLastStatusNotified(status);
    if (status === "completed" || status === "complete") {
      toast({
        title: "Run completed",
        description: `Run ${activeRunId.slice(0, 8)} finished successfully.`,
      });
    } else if (status === "failed" || status === "complete_with_errors") {
      toast({
        title: "Run requires attention",
        description: `Run ${activeRunId.slice(0, 8)} ${status.replace(/_/g, " ")}.`,
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const sourceLabel = activeRunDetail?.source?.connector
    ? activeRunDetail.source.connector.replace(/_/g, " ")
    : activeRunId
    ? "Manual upload"
    : "—";

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

          <div className="grid gap-6 lg:grid-cols-[2fr,minmax(280px,1fr)]">
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

              {reportQuery.isError && !isReportNotReady && (
                <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 mb-4 text-sm">
                  Error loading report: {reportQuery.error instanceof Error ? reportQuery.error.message : "Report not found or API error."}
                </div>
              )}

              <div className="min-h-[400px]">
                {/* Show pipeline status ONLY when report is not ready AND we don't have content yet */}
                {isPipelineRunning && !lastKnownContent && (
                  <div className="mb-4">
                    <PipelineStatus
                      runId={activeRunId}
                      onComplete={handlePipelineComplete}
                      onStatusChange={(status) => handlePipelineStatusChange(status)}
                    />
                  </div>
                )}

                {/* Show report viewer when we have content OR when initial loading */}
                {(lastKnownContent || (!isPipelineRunning && reportQuery.isFetching)) && (
                  <WideReportViewer
                    content={lastKnownContent}
                    isLoading={!lastKnownContent && reportQuery.isFetching}
                    runId={activeRunId}
                    sourceMeta={activeRunDetail?.source}
                    runStatus={activeRunDetail?.status?.toString()}
                    createdAt={activeRunDetail?.created_at}
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

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Connector Health</p>
                    <p className="font-semibold text-lg">{connectorsSummary.length} sources</p>
                  </div>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                {connectorsSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No connector activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {connectorsSummary.slice(0, 4).map((summary) => (
                      <div key={summary.name} className="rounded-lg border border-border/60 p-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{summary.name.replace(/_/g, " ")}</span>
                          <Badge variant={summary.failures > 0 ? "destructive" : "outline"} className="text-[10px] uppercase">
                            {summary.failures > 0 ? `${summary.failures} failed` : "healthy"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Last run: {formatTimestamp(summary.lastRun)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Run</p>
                    <p className="font-semibold text-lg">{activeRunId ? activeRunId.slice(0, 8) : "No run selected"}</p>
                  </div>
                  {activeRunId && (
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {activeRunDetail?.status || "unknown"}
                    </Badge>
                  )}
                </div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Connector</dt>
                    <dd className="font-medium capitalize">{sourceLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Created</dt>
                    <dd>{formatTimestamp(activeRunDetail?.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="capitalize">{activeRunDetail?.status || "unknown"}</dd>
                  </div>
                </dl>
                {!activeRunDetail && activeRunId && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Run not found in recent history. Enter a valid Run ID above to load its metadata.
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">Recent Runs</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredRunDetails.length} shown
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 mb-4">
                  <select
                    value={connectorFilter}
                    onChange={(event) => setConnectorFilter(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All sources</option>
                    {connectorOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "manual" ? "Manual upload" : option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All statuses</option>
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {runsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading recent runs...</p>
                ) : runsQuery.isError ? (
                  <p className="text-sm text-destructive">Failed to load runs.</p>
                ) : filteredRunDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No runs match the selected filters.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredRunDetails.slice(0, 10).map((detail) => {
                      const connectorKey = (detail.source?.connector || "manual").replace(/_/g, " ");
                      return (
                        <button
                          key={detail.run_id}
                          onClick={() => {
                            setRunInput(detail.run_id);
                            setActiveRunId(detail.run_id);
                          }}
                          className={cn(
                            "w-full text-left rounded-lg border px-3 py-2 transition hover:border-primary",
                            detail.run_id === activeRunId && "border-primary bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-mono text-xs">{detail.run_id.slice(0, 12)}</p>
                              <p className="text-[11px] text-muted-foreground">{formatTimestamp(detail.created_at)}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {connectorKey}
                              </Badge>
                              <p className="text-[11px] text-muted-foreground capitalize">
                                {detail.status || "unknown"}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
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
