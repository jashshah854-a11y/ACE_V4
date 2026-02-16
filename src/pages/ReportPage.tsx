import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, FileText, Sparkles, Shield, BookOpen, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { useSnapshot } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ExecutiveSummaryTab } from "@/components/report/ExecutiveSummaryTab";
import { InsightsTab } from "@/components/report/InsightsTab";
import { HypothesesTab } from "@/components/report/HypothesesTab";
import { TrustTab } from "@/components/report/TrustTab";
import { FullReportTab } from "@/components/report/FullReportTab";

const TABS = [
  { key: "summary", label: "Executive Summary", icon: FileText },
  { key: "insights", label: "Insights", icon: Sparkles },
  { key: "hypotheses", label: "Hypotheses", icon: Brain },
  { key: "trust", label: "Trust & Confidence", icon: Shield },
  { key: "report", label: "Full Report", icon: BookOpen },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReportPage() {
  const { runId } = useParams<{ runId: string }>();
  const { data: snapshot, isLoading, error } = useSnapshot(runId);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading report...</span>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-4">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load report"}
        </p>
        <Link to="/">
          <Button variant="outline">Back to Upload</Button>
        </Link>
      </div>
    );
  }

  const trust = snapshot.trust ?? { overall_confidence: 0 };
  const confidenceScore = trust.overall_confidence ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Analysis Report</h1>
              <p className="text-sm text-muted-foreground">
                Run{" "}
                <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {runId}
                </code>
                <span className="ml-3">
                  Confidence:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      confidenceScore >= 70
                        ? "text-green-400"
                        : confidenceScore >= 40
                          ? "text-yellow-400"
                          : "text-red-400",
                    )}
                  >
                    {Math.round(confidenceScore)}%
                  </span>
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6 border-b border-border pb-px overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                  isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {activeTab === "summary" && (
            <ExecutiveSummaryTab snapshot={snapshot} />
          )}
          {activeTab === "insights" && (
            <InsightsTab
              deepInsights={snapshot.deep_insights}
              govInsights={snapshot.governed_report?.insights ?? []}
            />
          )}
          {activeTab === "hypotheses" && (
            <HypothesesTab
              hypotheses={snapshot.hypotheses}
            />
          )}
          {activeTab === "trust" && (
            <TrustTab
              trust={snapshot.trust}
              governedReport={snapshot.governed_report}
              warnings={snapshot.run_warnings}
            />
          )}
          {activeTab === "report" && (
            <FullReportTab markdown={snapshot.report_markdown} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
