import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketingSimulationReport } from "@/types/reportTypes";
import { Activity, ArrowRight } from "lucide-react";

interface MarketingSimulationCardProps {
  data?: MarketingSimulationReport;
}

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return value.toFixed(3);
};

export function MarketingSimulationCard({ data }: MarketingSimulationCardProps) {
  if (!data || data.available !== true || !Array.isArray(data.scenarios) || data.scenarios.length === 0) {
    return null;
  }

  const baseline = data.baseline || {};

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-600" />
          Marketing What-If Snapshots
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Deterministic sensitivity checks based on current totals. These are not forecasts.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="CTR" value={formatNumber(baseline.ctr as number)} />
          <Metric label="CVR" value={formatNumber(baseline.cvr as number)} />
          <Metric label="ROAS" value={formatNumber(baseline.roas as number)} />
          <Metric label="CAC" value={formatNumber(baseline.cac as number)} />
        </div>

        <div className="space-y-4">
          {data.scenarios.map((scenario) => (
            <div key={scenario.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  {scenario.name}
                </div>
                <div className="text-xs text-slate-500">
                  {(scenario.assumptions || []).join(" · ")}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-700">
                {Object.entries(scenario.metrics || {}).map(([key, value]) => (
                  <div key={key} className="rounded-md border border-slate-200 bg-white p-2">
                    <div className="uppercase tracking-wide text-[10px] text-slate-500">{key}</div>
                    <div className="text-sm font-semibold text-slate-900">{formatNumber(value as number)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}
