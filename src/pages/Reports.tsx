import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/report/ProjectCard";
import { FileText, Plus, Search } from "lucide-react";

import { getReportsHistory } from "@/lib/api-client";
import {
  getRecentReports,
  saveRecentReport,
  getDiagnosticsCache,
  removeDiagnosticsCache,
  extractDiagnosticsNotes,
} from "@/lib/localStorage";

const Reports = () => {
  const [runInput, setRunInput] = useState("");
  const [diagnosticHints, setDiagnosticHints] = useState<Record<string, string[]>>({});
  const [recentReports, setRecentReports] = useState(() => getRecentReports());
  const navigate = useNavigate();

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

    runs.forEach((run) => {
      const notes = loadDiagnosticsForRun(run);
      if (notes?.length) {
        map[run] = notes;
      }
    });
    setDiagnosticHints(map);
  }, [recentReports, loadDiagnosticsForRun]);

  useEffect(() => {
    refreshDiagnosticHints();
    setRecentReports(getRecentReports());

    getReportsHistory().then((cloudReports) => {
      if (cloudReports.length > 0) {
        setRecentReports((prev) => {
          const combined = [...prev];
          cloudReports.forEach((cr) => {
            if (!combined.find((p) => p.runId === cr.runId)) {
              combined.push(cr);
            }
          });
          return combined.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
        });
      }
    });

    const interval = setInterval(() => {
      const local = getRecentReports();
      setRecentReports((prev) => {
        const combined = [...prev];
        local.forEach((l) => {
          if (!combined.find((p) => p.runId === l.runId)) {
            combined.unshift(l);
          }
        });
        return combined;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshDiagnosticHints]);

  const handleLoadReport = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    clearDiagnosticsCache(sanitized);
    saveRecentReport(sanitized, `Report ${sanitized.substring(0, 8)}`);
    setRecentReports(getRecentReports());
    navigate(`/app?run=${sanitized}`);
  };

  const handleCardClick = (runId: string) => {
    clearDiagnosticsCache(runId);
    navigate(`/app?run=${runId}`);
  };

  const criticalReports = useMemo(() => {
    return recentReports.filter((r) => (diagnosticHints[r.runId]?.length ?? 0) > 0);
  }, [recentReports, diagnosticHints]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="container px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Reports</h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Open a past run or jump to a new one by run ID.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-card border shadow-sm p-1.5 rounded-lg">
              <Search className="w-4 h-4 ml-2 text-muted-foreground" />
              <Input
                placeholder="Enter Run ID..."
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 h-8 w-[180px] bg-transparent font-mono text-xs"
              />
              <Button size="sm" onClick={handleLoadReport} disabled={!runInput.trim()}>
                Open
              </Button>
            </div>
          </div>

          {recentReports.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-card/30">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
                Upload a dataset to generate your first report.
              </p>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Start New Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {criticalReports.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
                  {criticalReports.length} report{criticalReports.length > 1 ? "s" : ""} have diagnostic flags. Review
                  first.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentReports.map((report) => (
                  <ProjectCard
                    key={report.runId}
                    report={report}
                    diagnosticHint={diagnosticHints[report.runId]?.[0]}
                    onClick={() => handleCardClick(report.runId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Reports;
