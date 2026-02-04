import { useRunPerformance, useRecommendations } from "@/lib/queries";
import { Clock, Zap, AlertTriangle, CheckCircle2, TrendingUp, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunMonitoringPanelProps {
  runId: string;
}

export function RunMonitoringPanel({ runId }: RunMonitoringPanelProps) {
  const { data: performance, isLoading: perfLoading } = useRunPerformance(runId);
  const { data: recommendations, isLoading: recsLoading } = useRecommendations(runId);

  if (perfLoading && recsLoading) {
    return (
      <div className="rounded-2xl border bg-card p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Section */}
      {performance && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">Performance Profile</h3>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Duration</p>
              <p className="text-xl font-bold text-foreground">
                {formatDuration(performance.total_duration_seconds)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Steps Completed</p>
              <p className="text-xl font-bold text-foreground">{performance.step_count}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Avg Step Time</p>
              <p className="text-xl font-bold text-foreground">
                {performance.step_count > 0
                  ? formatDuration(performance.total_duration_seconds / performance.step_count)
                  : "-"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-xl font-bold text-emerald-600">
                {performance.step_count > 0
                  ? `${Math.round(
                      (Object.values(performance.steps).filter((s) => s.success).length /
                        performance.step_count) *
                        100
                    )}%`
                  : "-"}
              </p>
            </div>
          </div>

          {/* Step Breakdown */}
          {Object.keys(performance.steps).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Step Breakdown</p>
              {Object.entries(performance.steps)
                .sort((a, b) => b[1].duration_seconds - a[1].duration_seconds)
                .map(([step, data]) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-32 truncate text-sm font-mono">{step}</div>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          data.success ? "bg-primary" : "bg-destructive"
                        )}
                        style={{ width: `${Math.min(data.percentage || 0, 100)}%` }}
                      />
                    </div>
                    <div className="w-20 text-right text-sm text-muted-foreground">
                      {formatDuration(data.duration_seconds)}
                    </div>
                    <div className="w-12 text-right text-xs text-muted-foreground">
                      {data.percentage?.toFixed(0) || 0}%
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Bottlenecks */}
          {performance.bottlenecks.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Top Bottlenecks
              </p>
              <div className="flex flex-wrap gap-2">
                {performance.bottlenecks.slice(0, 3).map((b) => (
                  <span
                    key={b.step}
                    className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium"
                  >
                    {b.step}: {formatDuration(b.duration_seconds)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">AI-Driven Recommendations</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {recommendations.total_count} recommendations
            </span>
          </div>

          {/* Signal Summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {recommendations.signal_summary.n_features > 0 && (
              <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">
                {recommendations.signal_summary.n_features} features analyzed
              </span>
            )}
            {recommendations.signal_summary.has_churn_signal && (
              <span className="px-2 py-1 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs">
                Churn signals detected
              </span>
            )}
            {recommendations.signal_summary.has_time_series && (
              <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs">
                Time series patterns
              </span>
            )}
          </div>

          {/* Top Recommendations */}
          <div className="space-y-3">
            {recommendations.recommendations.slice(0, 5).map((rec, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-lg border",
                  rec.priority === "Critical"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : rec.priority === "High"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <PriorityBadge priority={rec.priority} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{rec.action}</p>
                    <p className="text-sm text-muted-foreground mt-1">{rec.rationale}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        Category: <span className="font-medium">{formatCategory(rec.category)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Confidence: <span className="font-medium">{(rec.confidence * 100).toFixed(0)}%</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Impact: <span className="font-medium capitalize">{rec.impact}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recommendations.recommendations.length > 5 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              +{recommendations.recommendations.length - 5} more recommendations available
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    Critical: { icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
    High: { icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
    Medium: { icon: Target, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    Low: { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted" },
  }[priority] || { icon: CheckCircle2, color: "text-muted-foreground", bg: "bg-muted" };

  const Icon = config.icon;

  return (
    <div className={cn("p-2 rounded-lg", config.bg)}>
      <Icon className={cn("h-4 w-4", config.color)} />
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
