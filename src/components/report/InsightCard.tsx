import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/types";

function impactColor(score: number) {
  if (score >= 80) return "bg-red-500/10 text-red-400 border-red-500/20";
  if (score >= 60) return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-green-500/10 text-green-400 border-green-500/20";
}

function confidenceColor(confidence: string) {
  switch (confidence) {
    case "high":
      return "bg-green-500/10 text-green-400";
    case "medium":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{insight.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              impactColor(insight.impact_score),
            )}
          >
            Impact: {insight.impact_score}
          </span>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
              confidenceColor(insight.confidence),
            )}
          >
            {insight.confidence}
          </span>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex gap-3">
          <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Finding
            </p>
            <p className="text-foreground/90">{insight.finding}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Why It Matters
            </p>
            <p className="text-foreground/90">{insight.why_it_matters}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Lightbulb className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
              Recommendation
            </p>
            <p className="text-foreground/90">{insight.recommendation}</p>
          </div>
        </div>
      </div>

      {insight.category && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {insight.category}
          </span>
        </div>
      )}
    </div>
  );
}
