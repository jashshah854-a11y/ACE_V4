import type { BusinessIntelligence } from "@/types/reportTypes";
import { isValidArtifact } from "@/lib/artifactGuard";

interface VarianceBridgeChartProps {
  data?: BusinessIntelligence;
}

export function VarianceBridgeChart({ data }: VarianceBridgeChartProps) {
  if (!data || !isValidArtifact(data)) {
    return null;
  }
  const segments = data?.segment_value;
  const total = data?.value_metrics?.total_value ?? 0;
  if (!segments || !segments.length || !total) {
    return null;
  }

  const topSegments = segments.slice(0, 4);
  const deltas = topSegments.map((seg) => ({
    label: seg.segment,
    delta: (seg.value_contribution_pct ?? 0) / 100 * total,
  }));
  const baseline = Math.max(0, total - deltas.reduce((sum, seg) => sum + seg.delta, 0));
  let running = baseline;
  const steps = deltas.map((seg) => {
    const start = running;
    running += seg.delta;
    return { ...seg, start, end: running };
  });

  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Baseline {formatter.format(baseline)}</span>
        <span>Projected {formatter.format(running)}</span>
      </div>
      <div className="space-y-4">
        {steps.map((step) => {
          const width = Math.max(6, Math.round((step.delta / total) * 100));
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{step.label}</span>
                <span className="font-mono">+{formatter.format(step.delta)}</span>
              </div>
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
                  style={{ left: `${Math.min(95, (step.start / total) * 100)}%`, width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
