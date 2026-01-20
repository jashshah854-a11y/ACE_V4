import { Activity, Info } from "lucide-react";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";
import { ChartWrapper } from "@/components/report/ChartWrapper";
import { ExplanationBlock } from "@/components/report/ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";

interface CorrelationInsightsCardProps {
  data?: EnhancedAnalyticsData["correlation_analysis"];
  onViewEvidence?: () => void;
}

export function CorrelationInsightsCard({ data, onViewEvidence }: CorrelationInsightsCardProps) {
  if (!data?.available || !Array.isArray(data.strong_correlations) || data.strong_correlations.length === 0) {
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
        <div key={`${pair.feature1}-${pair.feature2}`} className="border border-border/30 rounded-xl p-3">
          <div className="flex items-center justify-between text-sm font-medium text-foreground">
            <span>{pair.feature1}</span>
            <span className="text-muted-foreground px-2">{directionGlyph(pair.direction)}</span>
            <span>{pair.feature2}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span>pearson: {Number(pair.pearson).toFixed(2)}</span>
            <span>spearman: {Number(pair.spearman).toFixed(2)}</span>
            {pair.strength && (
              <span className="uppercase tracking-wide text-[10px]">{pair.strength}</span>
            )}
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
          "Spearman": "Rank correlation (-1 to +1). Captures non-linear monotonic relationships.",
          "Positive (POS)": "Variables move in the same direction",
          "Negative (NEG)": "Variables move in opposite directions",
        }}
      />
    </div>
  );
}
