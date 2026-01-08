import React from "react";
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

const LabPage = () => {
    const { runId } = useParams<{ runId: string }>();

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
                </main>
                <Footer />
            </div>
        );
    }
    if (reportQuery.isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;

    // Extract numeric columns for simulation
    const numericColumns = reportData?.profile?.columns
        ? Object.entries(reportData.profile.columns)
            .filter(([_, col]: [string, any]) =>
                col.dtype && (col.dtype.includes('int') || col.dtype.includes('float'))
            )
            .map(([name]) => name)
        : [];

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
