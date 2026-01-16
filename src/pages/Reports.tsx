
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntelligenceCanvas } from "@/components/intelligence/IntelligenceCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "@/components/report/ProjectCard"; // New component
import {
  FileText, Plus, Search, Loader2, CheckCircle2,
  History, LayoutGrid, ListFilter, SlidersHorizontal
} from "lucide-react";

import { getReport } from "@/lib/api-client";
import {
  getRecentReports,
  saveRecentReport,
  getDiagnosticsCache,
  removeDiagnosticsCache,
  extractDiagnosticsNotes
} from "@/lib/localStorage";

const Reports = () => {
  const [searchParams] = useSearchParams();
  const runFromUrl = searchParams.get("run");
  const initialRunId = runFromUrl || "";

  const [runInput, setRunInput] = useState("");
  const [activeRunId, setActiveRunId] = useState(initialRunId);
  const [diagnosticHints, setDiagnosticHints] = useState<Record<string, string[]>>({});
  const [recentReports, setRecentReports] = useState(() => getRecentReports());

  // --- Diagnostics Management ---
  const loadDiagnosticsForRun = useCallback((run?: string) => {
    if (!run) return undefined;
    const payload = getDiagnosticsCache(run);
    const notes = extractDiagnosticsNotes(payload);
    return notes.length ? notes : undefined;
  }, []);

  const clearDiagnosticsCache = useCallback((run?: string) => {
    if (!run) return;
    removeDiagnosticsCache(run);
    setDiagnosticHints((prev) => {
      if (!prev[run]) return prev;
      const next = { ...prev };
      delete next[run];
      return next;
    });
  }, []);

  const refreshDiagnosticHints = useCallback(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, string[]> = {};
    const runs = new Set<string>();
    recentReports.forEach((r) => runs.add(r.runId));
    if (activeRunId) runs.add(activeRunId);

    runs.forEach((run) => {
      const notes = loadDiagnosticsForRun(run);
      if (notes?.length) {
        map[run] = notes;
      }
    });
    setDiagnosticHints(map);
  }, [recentReports, activeRunId, loadDiagnosticsForRun]);

  // Refresh data on mount and updates
  useEffect(() => {
    refreshDiagnosticHints();
    // Update recents periodically to catch new runs
    const interval = setInterval(() => {
      setRecentReports(getRecentReports());
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshDiagnosticHints]);


  // --- Report Loading ---
  const handleLoadReport = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    clearDiagnosticsCache(sanitized);
    setActiveRunId(sanitized);
    // Add to history immediately so it shows up in the grid
    saveRecentReport(sanitized, `Report ${sanitized.substring(0, 8)}`);
    setRecentReports(getRecentReports());
  };

  const handleCardClick = (runId: string) => {
    setActiveRunId(runId);
    clearDiagnosticsCache(runId);
  };

  // --- Filtering ---
  const criticalReports = useMemo(() => {
    return recentReports.filter(r => (diagnosticHints[r.runId]?.length ?? 0) > 0);
  }, [recentReports, diagnosticHints]);

  // --- Views ---

  // [MAGNA CARTA] V4: Active Report View (Full Screen Canvas)
  if (activeRunId) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-[60] text-slate-500 hover:text-white hover:bg-slate-800"
          onClick={() => {
            setActiveRunId("");
            setRunInput("");
          }}
          title="Back to Reports Center"
        >
          <Search className="h-5 w-5" />
        </Button>
        <IntelligenceCanvas runId={activeRunId} />
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container px-4 max-w-7xl">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Reports Center</h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Manage your intelligence assets. Access historical analyses, monitor diagnostics, and launch new runs.
              </p>
            </div>

            {/* Quick Launch Bar */}
            <div className="flex items-center gap-2 bg-card border shadow-sm p-1.5 rounded-lg">
              <Search className="w-4 h-4 ml-2 text-muted-foreground" />
              <Input
                placeholder="Enter Run ID..."
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 h-8 w-[180px] bg-transparent font-mono text-xs"
              />
              <Button size="sm" onClick={handleLoadReport} disabled={!runInput.trim()}>
                Launch
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  <LayoutGrid className="w-4 h-4" /> All Reports
                </TabsTrigger>
                <TabsTrigger value="critical" className="gap-2">
                  <ListFilter className="w-4 h-4" /> Critical Cases
                  {criticalReports.length > 0 && (
                    <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded-full">
                      {criticalReports.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Filter
                </Button>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> New Analysis
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="mt-0">
              {recentReports.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/30">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
                    You haven't generated any reports yet. Upload a dataset to get started.
                  </p>
                  <Button variant="outline">Run Demo Analysis</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {recentReports.map(report => (
                    <ProjectCard
                      key={report.runId}
                      report={report}
                      diagnosticHint={diagnosticHints[report.runId]?.[0]}
                      onClick={() => handleCardClick(report.runId)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="critical" className="mt-0">
              {criticalReports.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center border border-dashed rounded-xl">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                  <h3 className="font-medium">All Clear</h3>
                  <p className="text-muted-foreground text-sm">No reports currently have critical diagnostic flags.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {criticalReports.map(report => (
                    <ProjectCard
                      key={report.runId}
                      report={report}
                      diagnosticHint={diagnosticHints[report.runId]?.[0]}
                      onClick={() => handleCardClick(report.runId)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;
