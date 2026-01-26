import { TrendingUp, Info } from "lucide-react";
import type { ImportanceReport, ModelFitReport, CollinearityReport } from "@/types/reportTypes";
import { cn } from "@/lib/utils";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { isValidArtifact } from "@/lib/artifactGuard";

interface TopDriversCardProps {
  importanceReport?: ImportanceReport | null;
  modelFitReport?: ModelFitReport | null;
  collinearityReport?: CollinearityReport | null;
  safeMode?: boolean;
  onViewEvidence?: () => void;
}

export function TopDriversCard({ importanceReport, modelFitReport, collinearityReport, safeMode, onViewEvidence }: TopDriversCardProps) {
  if (!importanceReport || !isValidArtifact(importanceReport) || !Array.isArray(importanceReport.features) || importanceReport.features.length === 0) {
    return null;
  }

  const topDrivers = importanceReport.features.slice(0, 4);
  const maxImportance = Math.max(...topDrivers.map((entry) => Math.abs(Number(entry.importance) || 0))) || 1;
  const targetLabel = modelFitReport?.target_column || importanceReport.target_column || "primary outcome";
  const methodLabel = importanceReport.method || "Permutation importance";
  const splitLabel = modelFitReport?.dataset_split
    ? `${modelFitReport.dataset_split.train_rows ?? "?"} train / ${modelFitReport.dataset_split.test_rows ?? "?"} test`
    : "Split unavailable";
  const baseline = modelFitReport?.baseline_metrics || {};
  const metrics = modelFitReport?.metrics || {};
  const baselineText = metrics.rmse && baseline.rmse
    ? `RMSE ${Number(metrics.rmse).toFixed(2)} vs baseline ${Number(baseline.rmse).toFixed(2)}`
    : metrics.accuracy && baseline.accuracy
      ? `Accuracy ${Number(metrics.accuracy).toFixed(2)} vs baseline ${Number(baseline.accuracy).toFixed(2)}`
      : "Baseline comparison unavailable";
  const collinearityNote = collinearityReport?.max_vif && collinearityReport.max_vif >= 10
    ? `Collinearity warning: max VIF ${Number(collinearityReport.max_vif).toFixed(1)}`
    : undefined;

  // Get explanation copy with tokens
  const explanationCopy = getSectionCopy("drivers", {
    targetVariable: targetLabel,
    model_type: methodLabel,
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
              <span>{value.toFixed(1)}</span>
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
                <span className="font-mono">{value.toFixed(2)} / 100</span>
              </div>
              {(driver.ci_low != null || driver.ci_high != null) && (
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">95% CI:</span>
                  <span className="font-mono">
                    {driver.ci_low != null ? driver.ci_low.toFixed(2) : "n/a"} - {driver.ci_high != null ? driver.ci_high.toFixed(2) : "n/a"}
                  </span>
                </div>
              )}
              <div className="text-slate-300 text-[10px] leading-tight">
                {methodLabel}. Importance is normalized to a 0-100 scale.
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
        title={`Top Drivers: ${targetLabel}`}
        questionAnswered="Which features have the strongest influence on outcomes?"
        source={methodLabel}
        chart={chartContent}
        caption={
          {
            text: collinearityNote ? `${baselineText}. ${collinearityNote}` : baselineText,
            severity: collinearityNote ? "warning" : "positive",
          }
        }
        metricDefinitions={{
          "Method": methodLabel,
          "Dataset split": splitLabel,
          "Importance Score": "Normalized to 0-100 using permutation importance on the holdout set.",
          [targetLabel]: "The outcome variable being predicted or explained.",
          "Interpretation": "Hover over any bar to see confidence intervals and driver details.",
        }}
      />
    </div>
  );
}
