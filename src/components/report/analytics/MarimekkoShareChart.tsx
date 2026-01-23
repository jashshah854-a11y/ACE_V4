import type { BusinessIntelligence } from "@/types/reportTypes";
import { isValidArtifact } from "@/lib/artifactGuard";

interface MarimekkoShareChartProps {
  data?: BusinessIntelligence;
}

export function MarimekkoShareChart({ data }: MarimekkoShareChartProps) {
  if (!data || !isValidArtifact(data)) {
    return null;
  }
  const segments = data?.segment_value;
  if (!segments || segments.length === 0) {
    return null;
  }
  const normalized = segments
    .filter((seg) => typeof seg.value_contribution_pct === "number")
    .slice(0, 6);
  const totalPct = normalized.reduce((sum, seg) => sum + (seg.value_contribution_pct ?? 0), 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-24 w-full overflow-hidden rounded-2xl border border-border/40">
        {normalized.map((seg) => {
          const pct = ((seg.value_contribution_pct ?? 0) / totalPct) * 100;
          return (
            <div
              key={seg.segment}
              className="relative flex flex-1 items-end justify-center text-[11px] font-mono text-white"
              style={{
                width: `${pct}%`,
                backgroundImage: "linear-gradient(135deg, rgba(0,94,184,0.9), rgba(45,212,191,0.8))",
              }}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10 p-2 text-center leading-tight">
                <p className="font-semibold">{seg.segment}</p>
                <p>{(seg.value_contribution_pct ?? 0).toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Segments sized by share of total value. Wider columns indicate more opportunity; narrow ones highlight potential white space.
      </p>
    </div>
  );
}
