import { TrendingUp, Info } from "lucide-react";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";
import { cn } from "@/lib/utils";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";

interface TopDriversCardProps {
  data?: EnhancedAnalyticsData["feature_importance"];
  safeMode?: boolean;
  onViewEvidence?: () => void;
}

export function TopDriversCard({ data, safeMode, onViewEvidence }: TopDriversCardProps) {
  if (!data?.available || !Array.isArray(data.feature_importance) || data.feature_importance.length === 0) {
    return null;
  }

  const topDrivers = data.feature_importance.slice(0, 4);
  const maxImportance = Math.max(...topDrivers.map((entry) => Math.abs(Number(entry.importance) || 0))) || 1;

  // Get explanation copy with tokens
  const explanationCopy = getSectionCopy("drivers", {
    targetVariable: data.target || "primary outcome",
    model_type: data.task_type === "regression" ? "Regression" : "Classification",
    sample_size: "dataset",
  });

  const chartContent = (
    <div className={cn(
      "space-y-3",
      safeMode && "opacity-70"
    )}>
      {topDrivers.map((driver) => {
        const value = Math.abs(Number(driver.importance) || 0);
        const pct = Math.max(2, Math.round((value / maxImportance) * 100));
        return (
          <div key={driver.feature}>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{driver.feature}</span>
              <span>{value.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <ExplanationBlock {...explanationCopy} />

      <ChartWrapper
        title={`Top Drivers: ${data.target || "Primary Outcome"}`}
        questionAnswered="Which features have the strongest influence on outcomes?"
        source={data.task_type || "Feature importance analysis"}
        confidence={data.confidence}
        chart={chartContent}
        caption={
          data.insights?.[0]
            ? {
              text: data.insights[0],
              severity: "positive",
            }
            : undefined
        }
        metricDefinitions={{
          "Importance Score": "Relative contribution to prediction accuracy. Higher values indicate stronger influence.",
          [data.target || "Target"]: "The outcome variable being predicted or explained.",
        }}
      />
    </div>
  );
}
