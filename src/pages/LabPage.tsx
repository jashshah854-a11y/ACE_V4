import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import SimulationControls from "@/components/report/SimulationControls";
import { useGovernedReport } from "@/hooks/useGovernedReport";
import { useReportData } from "@/hooks/useReportData";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/lib/api-client";
import { Loader2, Beaker, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GuidanceOverlay } from "@/components/report/GuidanceOverlay";
import { getRecentReports, extractDiagnosticsNotes, getDiagnosticsCache } from "@/lib/localStorage";

const LabPage = () => {
    const { runId } = useParams<{ runId: string }>();
    const [recentRuns, setRecentRuns] = useState(() => getRecentReports());
    const [recentHints, setRecentHints] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (typeof window === "undefined") return;
        const refresh = () => setRecentRuns(getRecentReports());
        refresh();
        window.addEventListener('focus', refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);

    useEffect(() => {
        const map: Record<string, string[]> = {};
        recentRuns.forEach((run) => {
            const notes = extractDiagnosticsNotes(getDiagnosticsCache(run.runId));
            if (notes.length) {
                map[run.runId] = notes;
            }
        });
        setRecentHints(map);
    }, [recentRuns]);

    const reportQuery = useQuery({
        queryKey: ["lab-report", runId],
        queryFn: () => getReport(runId || ""),
        enabled: Boolean(runId),
    });

    const { data: governedReport } = useGovernedReport(runId || "");
    const reportData = useReportData(reportQuery.data || "", runId || "", "strict", governedReport);

    // Safe handling for missing runId
    if (!runId) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <main className="container flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-6">
                        <Beaker className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Welcome to Strategy Lab</h1>
                    <p className="text-muted-foreground max-w-md mb-8">
                        Select an existing analysis report to enter the simulation environment.
                    </p>
                    <Link to="/reports">
                        <Button size="lg" className="gap-2">
                            View Reports to Select <ArrowLeft className="w-4 h-4 rotate-180" />
                        </Button>
                    </Link>

                    {recentRuns.length > 0 ? (
                        <div
                            className="mt-10 w-full max-w-3xl text-left"
                            data-guidance-context="global"
                        >
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Recent runs</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {recentRuns.slice(0, 4).map((run) => {
                                    const hint = recentHints[run.runId]?.[0];
                                    return (
                                        <Link
                                            key={run.runId}
                                            to={`/lab/${run.runId}`}
                                            className="rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-left shadow-sm transition hover:border-purple-300 hover:bg-white"
                                        >
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <code className="font-mono">{run.runId.slice(0, 8)}</code>
                                                {run.createdAt ? (
                                                    <>
                                                        <span>•</span>
                                                        <span className="truncate">{run.createdAt}</span>
                                                    </>
                                                ) : null}
                                            </div>
                                            <p className="text-sm font-semibold text-foreground truncate">
                                                {run.title || "Analysis Report"}
                                            </p>
                                            <p className={`text-xs mt-1 line-clamp-2 ${hint ? "text-amber-800" : "text-muted-foreground/80"}`}>
                                                {hint || "Diagnostics pending…"}
                                            </p>
                                            <span className="text-[10px] uppercase tracking-widest text-purple-600 font-semibold">Enter Lab ?</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-8 max-w-xl mx-auto">
                            Once you run an analysis, it will appear here so you can jump into Strategy Lab with the proper trust context.
                        </p>
                    )}
                </main>
                <Footer />
            </div>
        );
    }
    if (reportQuery.isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

    // Extract numeric columns for simulation
    const numericColumns = reportData?.profile?.numericColumns ?? [];
    const inlineHint = useMemo(() => {
        if (reportData?.guidanceNotes?.length) {
            const first = reportData.guidanceNotes[0];
            if (typeof first === 'string') return first;
            return first?.message || first?.id || null;
        }
        if (runId) {
            const hints = extractDiagnosticsNotes(getDiagnosticsCache(runId));
            if (hints.length) return hints[0];
        }
        return null;
    }, [reportData?.guidanceNotes, runId]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container py-24 max-w-7xl">
                <div className="mb-8">
                    <Link to={`/report/summary?run=${runId}`} className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4">
                        <ArrowLeft className="w-4 h-4" /> Back to Report
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Beaker className="w-8 h-8 text-purple-500" />
                        Strategy Lab
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Advanced simulation and what-if analysis environment.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        {reportData.guidanceNotes?.length ? (
                            <GuidanceOverlay notes={reportData.guidanceNotes} context="global" />
                        ) : null}

                        {/* Left Panel: Controls */}
                        <div className="border border-border/40 rounded-xl p-6 bg-card">
                            <h3 className="font-semibold mb-4">Simulation Parameters</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Adjust variables to forecast business impact.
                            </p>
                            {/* Controls will reside here in the SimulationControls component, 
                   but we might need to adjust it to fit a sidebar layout better if it isn't responsive. 
                   For now, reusing the existing component. */}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {/* Right Panel: Simulation Area */}
                        <div className="bg-card border border-border/40 rounded-xl p-6 min-h-[600px]">
                            {inlineHint ? (
                                <div className="mb-5 inline-flex w-full items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900"
                                     data-guidance-context="global">
                                    <Lightbulb className="h-4 w-4 mt-0.5 text-amber-600" />
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-amber-600">Diagnostics Hint</p>
                                        <p className="text-sm">{inlineHint}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-5 text-xs text-muted-foreground/70">
                                    Diagnostics guidance will appear here after the report finishes running.
                                </div>
                            )}
                            {numericColumns.length > 0 ? (
                                <SimulationControls
                                    runId={runId}
                                    availableColumns={numericColumns}
                                />
                            ) : (
                                <div className="text-center text-muted-foreground py-20">
                                    No compatible numeric data found for simulation.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default LabPage;

