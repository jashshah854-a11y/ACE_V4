import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Activity } from "lucide-react";
import type { MarketingRiskReport, MarketingRiskItem } from "@/types/reportTypes";

interface MarketingRiskDashboardProps {
  data?: MarketingRiskReport;
}

const formatPercent = (value?: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${value.toFixed(2)}%`;
};

const formatNumber = (value?: number) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return value.toFixed(3);
};

const severityStyles: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const renderDelta = (item: MarketingRiskItem) => {
  if (typeof item.delta_pct !== "number") return "n/a";
  const sign = item.delta_pct > 0 ? "+" : "";
  return `${sign}${item.delta_pct.toFixed(1)}%`;
};

export function MarketingRiskDashboard({ data }: MarketingRiskDashboardProps) {
  if (!data || data.available !== true) {
    return null;
  }

  const metrics = data.metrics || {};
  const riskItems = data.risk_items || [];
  const detectedSignals = Object.entries(metrics)
    .filter(([, value]) => typeof value === "number" && !Number.isNaN(value))
    .map(([key]) => key)
    .sort();

  return (
    <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-rose-500" />
          Marketing Risk Report
        </CardTitle>
        <p className="text-sm text-muted-foreground">{data.definition}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="CTR" value={formatPercent(metrics.ctr)} />
          <MetricCard label="CVR" value={formatPercent(metrics.cvr)} />
          <MetricCard label="ROAS" value={formatNumber(metrics.roas)} />
          <MetricCard label="CAC" value={formatNumber(metrics.cac)} />
        </div>

        {riskItems.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Risks detected
            </div>
            <div className="space-y-3">
              {riskItems.map((item, idx) => (
                <div key={`${item.type}-${idx}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {item.metric} risk: {item.type.replace(/_/g, " ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Evidence: {(item.evidence_columns || []).join(", ") || "n/a"}
                      </div>
                    </div>
                    <Badge className={severityStyles[item.severity] || severityStyles.low}>{item.severity}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {typeof item.prior === "number" && typeof item.recent === "number" ? (
                      <span>
                        Prior: {formatNumber(item.prior)} ? Recent: {formatNumber(item.recent)} (? {renderDelta(item)})
                      </span>
                    ) : (
                      <span>? {renderDelta(item)}</span>
                    )}
                  </div>
                  {item.segments?.length ? (
                    <div className="mt-3 text-xs text-slate-600">
                      <div className="font-semibold text-slate-700">Worst segments</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {item.segments.map((seg) => (
                          <span key={seg.segment} className="rounded-full bg-slate-100 px-2 py-1">
                            {seg.segment}: {formatNumber(seg.value)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            No material marketing risks detected based on available signals.
          </div>
        )}

        {detectedSignals.length > 0 ? (
          <div className="text-xs text-muted-foreground">
            Signals detected: {detectedSignals.join(", ")}
          </div>
        ) : null}

        {data.missing_signals?.length ? (
          <div className="text-xs text-muted-foreground">
            Missing signals: {data.missing_signals.join(", ")}
          </div>
        ) : null}

        {data.missing_signals?.length ? (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
            This dataset does not include all marketing signals. The report only reflects available inputs.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
