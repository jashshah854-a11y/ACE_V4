
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WideReportViewer } from "@/components/report/WideReportViewer";
import {
  FileText,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  Plus,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getReport } from "@/lib/api-client";

interface Report {
  id: string;
  title: string;
  description: string;
  type: "quality" | "anomaly" | "trend" | "summary";
  generatedAt: string;
  period: string;
  status: "ready" | "generating" | "scheduled";
}

const reports: Report[] = [
  {
    id: "1",
    title: "Weekly Data Quality Report",
    description: "Comprehensive analysis of data quality metrics across all sources",
    type: "quality",
    generatedAt: "Dec 4, 2025",
    period: "Nov 27 - Dec 4",
    status: "ready",
  },
  {
    id: "2",
    title: "Anomaly Detection Summary",
    description: "Detailed breakdown of detected anomalies and resolution status",
    type: "anomaly",
    generatedAt: "Dec 3, 2025",
    period: "November 2025",
    status: "ready",
  },
  {
    id: "3",
    title: "Data Quality Trend Analysis",
    description: "Historical trends and predictive insights for data quality",
    type: "trend",
    generatedAt: "Dec 1, 2025",
    period: "Q4 2025",
    status: "ready",
  },
  {
    id: "4",
    title: "Executive Summary Report",
    description: "High-level overview for stakeholders and decision makers",
    type: "summary",
    generatedAt: "Scheduled",
    period: "December 2025",
    status: "scheduled",
  },
];

const typeConfig: Record<Report["type"], { icon: typeof FileText; color: string; bg: string }> = {
  quality: { icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
  anomaly: { icon: PieChart, color: "text-warning", bg: "bg-warning/10" },
  trend: { icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
  summary: { icon: FileText, color: "text-info", bg: "bg-info/10" },
};

const Reports = () => {
  const [runInput, setRunInput] = useState("");
  const [activeRunId, setActiveRunId] = useState("");

  const reportQuery = useQuery<string | undefined>({
    queryKey: ["final-report", activeRunId],
    queryFn: () => getReport(activeRunId),
    enabled: Boolean(activeRunId),
    retry: false
  });

  const handleLoadReport = () => {
    const sanitized = runInput.trim();
    if (!sanitized) return;
    setActiveRunId(sanitized);
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

          <div className="grid gap-8 lg:grid-cols-[1fr,350px]">
            {/* Main Content Area */}
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

                {reportQuery.isError && (
                  <div className="p-4 rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 mb-4 text-sm">
                    Error loading report: {reportQuery.error instanceof Error ? reportQuery.error.message : "Report not found or API error."}
                  </div>
                )}

                <div className="min-h-[400px]">
                  <WideReportViewer
                    content={reportQuery.data}
                    isLoading={reportQuery.isFetching}
                    runId={activeRunId}
                  />
                  {!activeRunId && !reportQuery.data && !reportQuery.isFetching && (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mb-4 opacity-20" />
                      <p>Enter a Run ID above to view the wide premium report layout.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar / Recent Reports */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
                <div className="space-y-4">
                  {reports.map((report) => {
                    const ReportIcon = typeConfig[report.type].icon;
                    return (
                      <div
                        key={report.id}
                        className="group rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg shrink-0", typeConfig[report.type].bg)}>
                            <ReportIcon className={cn("h-4 w-4", typeConfig[report.type].color)} />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm line-clamp-1">{report.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{report.description}</p>
                            <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                              <span className="bg-secondary px-1.5 py-0.5 rounded">{report.period}</span>
                              <span>•</span>
                              <span>{report.generatedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl purple-gradient text-white">
                <h3 className="font-semibold mb-2">Need Custom Insights?</h3>
                <p className="text-sm opacity-90 mb-3">
                  Configure the ACE Engine to generate specialized reports for your specific domain.
                </p>
                <Button size="sm" variant="secondary" className="w-full text-primary font-medium">
                  Configure Agent
                </Button>
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
