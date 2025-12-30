import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalWidget } from "@/components/trust/SignalWidget";

interface ReportMetricsStripProps {
  confidenceValue: number | undefined;
  dataQualityValue: number | undefined;
  clusterMetrics: { clusterCount?: number; clusterSizes?: number[] } | null;
}

export function ReportMetricsStrip({ confidenceValue, dataQualityValue, clusterMetrics }: ReportMetricsStripProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3 mb-4">
      {/* Confidence bar */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Confidence</div>
            <div className="text-lg font-semibold">{confidenceValue ?? "n/a"}%</div>
          </div>
          <SignalWidget score={(confidenceValue || 0) / 100} compact={true} />
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, confidenceValue || 0))}%` }}
          />
        </div>
      </Card>

      {/* Data quality bar */}
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Data Quality</div>
            <div className="text-lg font-semibold">{dataQualityValue ?? "n/a"}%</div>
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

      {/* Cluster mini-map */}
      <Card className="p-3">
        <div className="text-xs uppercase text-muted-foreground">Clusters</div>
        <div className="text-sm text-muted-foreground">
          {clusterMetrics?.clusterCount ? `${clusterMetrics.clusterCount} clusters` : "n/a"}
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
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">No cluster sizes available</div>
        )}
      </Card>
    </div>
  );
}

interface IdentityTrustStripProps {
  identityStats: { rows: any; completeness?: number };
  confidenceLevel: number | string | undefined;
  uncertaintySignals: string[];
}

export function IdentityTrustStrip({ identityStats, confidenceLevel, uncertaintySignals }: IdentityTrustStripProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 mb-4">
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
      </Card>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Trust & Validation</span>
          <Badge variant="secondary">Confidence-aware</Badge>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Confidence: {confidenceLevel ?? "n/a"}%</div>
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
