import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground mt-1">
                Generated intelligence reports and analytics
              </p>
            </div>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>

          {/* Reports Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {reports.map((report) => {
              const ReportIcon = typeConfig[report.type].icon;
              
              return (
                <div
                  key={report.id}
                  className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      typeConfig[report.type].bg
                    )}>
                      <ReportIcon className={cn(
                        "h-5 w-5",
                        typeConfig[report.type].color
                      )} />
                    </div>
                    
                    {report.status === "ready" ? (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                        {report.status === "generating" ? "Generating..." : "Scheduled"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{report.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {report.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{report.period}</span>
                    </div>
                    <span>•</span>
                    <span>{report.generatedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Report Types Info */}
          <div className="mt-12 p-6 rounded-2xl glass-card">
            <h3 className="text-lg font-semibold mb-4">Available Report Types</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(typeConfig).map(([type, config]) => {
                const Icon = config.icon;
                const labels: Record<string, string> = {
                  quality: "Quality Reports",
                  anomaly: "Anomaly Reports", 
                  trend: "Trend Analysis",
                  summary: "Executive Summaries",
                };
                const descriptions: Record<string, string> = {
                  quality: "Detailed data quality metrics",
                  anomaly: "Anomaly detection insights",
                  trend: "Historical trend analysis",
                  summary: "High-level overviews",
                };
                
                return (
                  <div key={type} className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{labels[type]}</p>
                      <p className="text-xs text-muted-foreground">{descriptions[type]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Reports;
