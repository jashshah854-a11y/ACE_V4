import { TrendingUp, Info } from "lucide-react";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";
import { cn } from "@/lib/utils";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { isValidArtifact } from "@/lib/artifactGuard";

interface TopDriversCardProps {
  data?: EnhancedAnalyticsData["feature_importance"];
  safeMode?: boolean;
  onViewEvidence?: () => void;
}

export function TopDriversCard({ data, safeMode, onViewEvidence }: TopDriversCardProps) {
  if (!data || !isValidArtifact(data) || !Array.isArray(data.feature_importance) || data.feature_importance.length === 0) {
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
          <div key={driver.feature} className="group relative">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{driver.feature}</span>
              <span>{value.toFixed(2)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Tooltip on hover */}
            <div className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs pointer-events-none w-64">
              <div className="font-semibold mb-1 border-b border-white/10 pb-1">{driver.feature}</div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Importance:</span>
                <span className="font-mono">{value.toFixed(3)}</span>
              </div>
              <div className="text-slate-300 text-[10px] leading-tight">
                {data.task_type === "regression"
                  ? "Normalized coefficient. Represents the relative weight of this factor in predicting the outcome."
                  : "Feature importance score. Represents how heavily the model relies on this factor for classification."}
              </div>
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
          "Importance Score": data.task_type === "regression"
            ? "Normalized coefficient (0-1 scale). Shows relative contribution to prediction. Higher = stronger influence."
            : "Feature importance (0-1 scale). Higher values indicate stronger influence on the outcome.",
          [data.target || "Target"]: "The outcome variable being predicted or explained.",
          "Interpretation": "Hover over any bar to see detailed information about that feature's impact.",
        }}
      />
    </div>
  );
}
