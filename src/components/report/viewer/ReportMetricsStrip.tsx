import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalWidget } from "@/components/trust/SignalWidget";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface ReportMetricsStripProps {
  dataQualityValue: number | undefined;
  clusterMetrics: { clusterCount?: number; clusterSizes?: number[] } | null;
}

export function ReportMetricsStrip({ dataQualityValue, clusterMetrics }: ReportMetricsStripProps) {
  const hasQuality = typeof dataQualityValue === "number" && !Number.isNaN(dataQualityValue);
  const hasClusters = Boolean(clusterMetrics?.clusterCount || clusterMetrics?.clusterSizes?.length);

  if (!hasQuality && !hasClusters) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 mb-4">
      {hasQuality && (
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Data Quality</div>
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                <AnimatedCounter value={dataQualityValue || 0} suffix="%" />
              </div>
            </div>
            <SignalWidget score={(dataQualityValue || 0) / 100} compact={true} />
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{ width: `${Math.min(100, Math.max(0, dataQualityValue || 0))}%` }}
            />
          </div>
        </Card>
      )}

      {hasClusters && (
        <Card className="p-3">
          <div className="text-xs uppercase text-muted-foreground">Clusters</div>
          <div className="text-sm text-muted-foreground">
            {clusterMetrics?.clusterCount !== undefined
              ? `${clusterMetrics.clusterCount} clusters`
              : clusterMetrics?.clusterSizes?.length
                ? `${clusterMetrics.clusterSizes.length} clusters`
                : null}
          </div>
          {clusterMetrics?.clusterSizes && clusterMetrics.clusterSizes.length > 0 ? (
            <div className="mt-2 flex gap-1">
              {clusterMetrics.clusterSizes.slice(0, 6).map((size: number, idx: number) => {
                const maxSize = Math.max(...clusterMetrics.clusterSizes!);
                const opacity = maxSize > 0 ? 0.6 + (size / maxSize) * 0.4 : 0.6;
                return (
                  <div
                    key={idx}
                    className="flex-1 h-2 rounded-full bg-blue-500/70"
                    style={{ opacity }}
                  />
                );
              })}
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

interface IdentityTrustStripProps {
  identityStats: { rows: any; completeness?: number };
  uncertaintySignals: string[];
}

export function IdentityTrustStrip({ identityStats, uncertaintySignals }: IdentityTrustStripProps) {
  if (!identityStats) return null;

  return (
    <div className="grid gap-3 md:grid-cols-1 mb-4">
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Dataset Identity</span>
          <Badge variant="secondary">Top-of-fold</Badge>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Rows: {identityStats.rows}</div>
        {identityStats.completeness !== undefined && (
          <div className="text-sm text-muted-foreground">
            Completeness: {(identityStats.completeness * 100).toFixed(1)}%
          </div>
        )}
        {uncertaintySignals.length > 0 && (
          <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
            {uncertaintySignals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

interface HighlightsRibbonProps {
  highlights: { label: string; tone: "default" | "warn" | "ok" }[];
}

export function HighlightsRibbon({ highlights }: HighlightsRibbonProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {highlights.map((chip, idx) => (
        <Badge
          key={idx}
          variant={chip.tone === "warn" ? "destructive" : chip.tone === "ok" ? "outline" : "secondary"}
          className={chip.tone === "warn" ? "border-amber-500 bg-amber-50 text-amber-800" : undefined}
        >
          {chip.label}
        </Badge>
      ))}
    </div>
  );
}
