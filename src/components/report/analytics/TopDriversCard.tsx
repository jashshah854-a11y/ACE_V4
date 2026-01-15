import { TrendingUp, Info } from "lucide-react";
import type { EnhancedAnalyticsData } from "@/types/reportTypes";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn(
      "rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm p-5 shadow-sm",
      safeMode && "opacity-70"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Top Drivers</p>
          <h3 className="text-lg font-semibold text-foreground">{data.target || "Primary outcome"}</h3>
        </div>
        <div className="flex items-center gap-3">
          {onViewEvidence && (
            <button
              type="button"
              onClick={onViewEvidence}
              className="rounded-full border border-border/50 p-1 text-muted-foreground hover:text-action"
              aria-label="View feature importance source"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          <TrendingUp className="w-5 h-5 text-purple-500" />
        </div>
      </div>

      <div className="space-y-3">
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

      {Array.isArray(data.insights) && data.insights.length > 0 && (
        <div className="mt-4 text-xs text-muted-foreground border-t border-border/30 pt-3">
          <p className="font-semibold text-foreground mb-1">Quick take</p>
          <p>{data.insights[0]}</p>
        </div>
      )}
    </div>
  );
}
