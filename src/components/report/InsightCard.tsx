import type { GovInsight } from "@/lib/types";

export function InsightCard({ insight }: { insight: GovInsight }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      {insight.title && (
        <h3 className="font-semibold text-foreground">{String(insight.title)}</h3>
      )}
      {insight.finding && (
        <p className="text-sm text-foreground/90 leading-relaxed">
          {String(insight.finding)}
        </p>
      )}
      {insight.evidence && (
        <p className="text-sm text-muted-foreground">
          {String(insight.evidence)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {insight.confidence && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 capitalize">
            {String(insight.confidence)}
          </span>
        )}
        {insight.category && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {String(insight.category)}
          </span>
        )}
      </div>
      {!insight.title && !insight.finding && (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
          {JSON.stringify(insight, null, 2)}
        </pre>
      )}
    </div>
  );
}
