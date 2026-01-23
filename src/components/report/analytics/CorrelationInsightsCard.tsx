import type { EnhancedAnalyticsData } from "@/types/reportTypes";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";
import { isValidArtifact } from "@/lib/artifactGuard";

interface CorrelationInsightsCardProps {
  data?: EnhancedAnalyticsData["correlation_analysis"];
  onViewEvidence?: () => void;
}

export function CorrelationInsightsCard({ data, onViewEvidence }: CorrelationInsightsCardProps) {
  if (!data || !isValidArtifact(data) || !Array.isArray(data.strong_correlations) || data.strong_correlations.length === 0) {
    return null;
  }

  const correlations = data.strong_correlations.slice(0, 4);

  const directionGlyph = (direction?: string) => {
    if (direction === "negative") return "↓ NEG";
    return "↑ POS";
  };

  const explanationCopy = getSectionCopy("correlations");

  const chartContent = (
    <div className="space-y-3">
      {correlations.map((pair) => (
        <div key={`${pair.feature1}-${pair.feature2}`} className="group relative border border-border/30 rounded-xl p-3 hover:border-border/60 transition-colors bg-card/50 hover:bg-card">
          <div className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>{pair.feature1}</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-bold",
              pair.direction === "negative" ? "bg-rose-100/50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" : "bg-teal-100/50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
            )}>
              {directionGlyph(pair.direction)}
            </span>
            <span>{pair.feature2}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
            <div className="flex gap-3">
              <span title="Linear relationship strength">pearson: {Number(pair.pearson).toFixed(2)}</span>
              <span title="Rank/Non-linear relationship strength">spearman: {Number(pair.spearman).toFixed(2)}</span>
            </div>
            {pair.strength && (
              <span className="uppercase tracking-wide text-[10px] font-semibold opacity-70">{pair.strength}</span>
            )}
          </div>

          {/* Hover Tooltip */}
          <div className="invisible group-hover:visible absolute left-0 top-full mt-2 z-20 bg-slate-900 text-white text-xs rounded-lg px-4 py-3 shadow-xl max-w-xs pointer-events-none w-72 border border-slate-700">
            <div className="font-semibold mb-2 border-b border-white/10 pb-2 text-center">
              {pair.feature1} <br />
              <span className="text-slate-400 text-[10px] font-normal">vs</span><br />
              {pair.feature2}
            </div>
            <div className="space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Pearson (Linear):</span>
                <span className="font-mono">{Number(pair.pearson).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Spearman (Rank):</span>
                <span className="font-mono">{Number(pair.spearman).toFixed(3)}</span>
              </div>
            </div>
            <div className="text-slate-300 text-[10px] leading-tight bg-white/5 p-2 rounded">
              {pair.direction === "negative"
                ? "Negative Correlation: As one variable increases, the other tends to decrease (inverse relationship)."
                : "Positive Correlation: As one variable increases, the other tends to increase as well."}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <ExplanationBlock {...explanationCopy} />

      <ChartWrapper
        title="Significant Relationships"
        questionAnswered="Which metrics move together or oppose each other?"
        source="Correlation analysis"
        sampleSize={data.total_correlations}
        chart={chartContent}
        caption={
          data.insights?.[0]
            ? {
              text: data.insights[0],
              severity: "neutral",
            }
            : undefined
        }
        metricDefinitions={{
          "Pearson": "Linear correlation (-1 to +1). Measures straight-line relationships.",
          "Spearman": "Rank correlation (-1 to +1). Captures non-linear patterns.",
          "Positive (POS)": "Variables move in the same direction.",
          "Negative (NEG)": "Variables move in opposite directions.",
          "How to read": "Hover over any pair to see detailed breakdown of the relationship.",
        }}
      />
    </div>
  );
}

// Helper for conditional class names if not imported
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
