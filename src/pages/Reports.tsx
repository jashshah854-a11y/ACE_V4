
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IntelligenceCanvas from "@/components/canvas/IntelligenceCanvas"; // [NEW CANVAS]
import { PipelineStatus } from "@/components/report/PipelineStatus";
import { FileText, Plus, Search, AlertCircle, Loader2, CheckCircle2, History, ChevronDown } from "lucide-react";
import { getReport, API_BASE } from "@/lib/api-client";
import { getRecentReports, saveRecentReport, validateAndCleanRecentReports, removeRecentReport } from "@/lib/localStorage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const Reports = () => {
  const [searchParams] = useSearchParams();
  const runFromUrl = searchParams.get("run");

  // If user navigates to /reports without ?run=, fall back to most recent run.
  const mostRecentRun = getRecentReports()[0]?.runId || "";
  const initialRunId = runFromUrl || mostRecentRun;

  const [runInput, setRunInput] = useState(initialRunId);
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const [hasValidated, setHasValidated] = useState(false);

  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Validate Run ID format (simple regex)
  useEffect(() => {
    const validate = async () => {
      if (!runInput) {
        setIsValid(null);
        return;
      }
      setIsValidating(true);
      // Simulate check (or could regex check activeRunId format if standardized)
      await new Promise(resolve => setTimeout(resolve, 600));
      setIsValid(runInput.length >= 8); // Simple length check for visual feedback
      setIsValidating(false);
    };

    const timeout = setTimeout(validate, 500);
    return () => clearTimeout(timeout);
  }, [runInput]);

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
      // Keep polling every 3s if we got a 404 OR explicit "not generated yet" error
      // Use efficient duck-typing to catch any error object with a message
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

  const isReportNotReady =
    reportQuery.isError &&
    (() => {
      const msg = (reportQuery.error as any)?.message || String(reportQuery.error);
      return msg.includes("404") || msg.includes("Report not generated yet");
    })();

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

  // Clear content when run ID changed (but only if it's a real change)
  useEffect(() => {
    if (activeRunId) {
      setIsPipelineRunning(false);
      // Don't clear content immediately if we are just switching back to a known run
      // Let react-query cache handle it, unless explicitly new
    }
  }, [activeRunId]);

  useEffect(() => {
    if (activeRunId) saveRecentReport(activeRunId, `Report ${activeRunId.substring(0, 8)}`);
  }, [activeRunId]);

  const handleLoadReport = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    setActiveRunId(sanitized);
  };

  const handleRecentSelect = (runId: string) => {
    setRunInput(runId);
    setActiveRunId(runId);
  };

  const handlePipelineComplete = () => {
    reportQuery.refetch();
  };

  const recentReports = getRecentReports();

  const recentReports = getRecentReports();

  // [MAGNA CARTA] V4: If Run is Active, Switch to Intelligence OS (Full Screen Canvas)
  if (activeRunId) {
    // If report is not ready (Pipeline Running), we show the Status.
    // However, IntelligenceCanvas handles loading/error states internally too.
    // For smoother transition, we delegate to IntelligenceCanvas immediately, 
    // but we can pass 'onBack' to return to search.

    // Note: Reports.tsx previously handled 'isReportNotReady' explicitly. 
    // For V4, we trust the Canvas to handle "Waiting for Report" or we assume activeRunId implies we want to see it.

    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* If we wanted a "Back" button overlay, we could add it here */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-[60] text-slate-500 hover:text-white hover:bg-slate-800"
          onClick={() => {
            setActiveRunId("");
            setRunInput("");
          }}
        >
          <Search className="h-5 w-5" />
        </Button>
        <IntelligenceCanvas runId={activeRunId} />
      </div>
    );
  }

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
            {/* Search Section (Legacy Wrapper for Home) */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" />
                    Report Viewer
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Enter a valid Run ID to launch the Intelligence Canvas.
                  </p>
                </div>

                {/* Input Group */}
                <div className="flex gap-2 w-full md:w-auto items-center">
                  {/* Recent Runs Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" title="Recent Runs">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[240px]">
                      <DropdownMenuLabel>Recent Reports</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {recentReports.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">No recent history</div>
                      ) : (
                        recentReports.slice(0, 5).map((r) => (
                          <DropdownMenuItem key={r.runId} onClick={() => handleRecentSelect(r.runId)}>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-medium">{r.runId}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{r.label || "Untitled Run"}</span>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="relative">
                    <Input
                      placeholder="Paste Run ID here..."
                      value={runInput}
                      onChange={(e) => setRunInput(e.target.value)}
                      className="font-mono text-sm w-[220px] pr-8"
                    />
                    <div className="absolute right-2 top-2.5">
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-teal-500" />
                      ) : null}
                    </div>
                  </div>

                  <Button onClick={handleLoadReport} disabled={!runInput.trim()}>
                    Launch
                  </Button>
                </div>
              </div>

              {/* Empty Home State */}
              <div className="h-[300px] flex flex-col items-center justify-center p-12 text-muted-foreground border-t border-dashed">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>Enter a Run ID to launch the ACE V4 Intelligence Canvas.</p>
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
