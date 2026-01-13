import { Activity } from "lucide-react";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";

interface CorrelationInsightsCardProps {
  data?: EnhancedAnalyticsData["correlation_analysis"];
}

export function CorrelationInsightsCard({ data }: CorrelationInsightsCardProps) {
  if (!data?.available || !Array.isArray(data.strong_correlations) || data.strong_correlations.length === 0) {
    return null;
  }

  const correlations = data.strong_correlations.slice(0, 4);

  const directionGlyph = (direction?: string) => {
    if (direction === "negative") return "NEG";
    return "POS";
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Behavior Watchlist</p>
          <h3 className="text-lg font-semibold text-foreground">Significant relationships</h3>
        </div>
        <Activity className="w-5 h-5 text-emerald-500" />
      </div>

      <div className="space-y-3">
        {correlations.map((pair) => (
          <div key={`${pair.feature1}-${pair.feature2}`} className="border border-border/30 rounded-xl p-3">
            <div className="flex items-center justify-between text-sm font-medium text-foreground">
              <span>{pair.feature1}</span>
              <span className="text-muted-foreground">{directionGlyph(pair.direction)}</span>
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

      {Array.isArray(data.insights) && data.insights.length > 0 && (
        <div className="mt-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <p className="font-semibold text-foreground mb-1">Insight</p>
          <p>{data.insights[0]}</p>
        </div>
      )}
    </div>
  );
}
