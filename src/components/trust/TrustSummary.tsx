import { useState } from "react";
import type { TrustModel, TrustComponent } from "@/types/trust";
import { cn } from "@/lib/utils";

const COMPONENT_LABELS: Record<string, string> = {
  data_quality: "Data quality",
  model_fit: "Model fit",
  stability: "Stability",
  validation_strength: "Validation strength",
  leakage_risk: "Leakage risk",
};

function statusTone(status: TrustComponent["status"]) {
  if (status === "high") return "text-emerald-600";
  if (status === "medium") return "text-amber-600";
  if (status === "low") return "text-rose-600";
  return "text-muted-foreground";
}

function formatScore(score: number | null) {
  if (score == null) return "unknown";
  return `${Math.round(score)} / 100`;
}

interface TrustSummaryProps {
  trust: TrustModel | null | undefined;
  className?: string;
}

export function TrustSummary({ trust, className }: TrustSummaryProps) {
  const [open, setOpen] = useState(false);

  if (!trust || trust.overall_confidence == null) return null;

  const overall = Math.round(trust.overall_confidence);
  const overallTone =
    overall >= 80 ? "text-emerald-600" : overall >= 60 ? "text-amber-600" : "text-rose-600";

  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/60 p-5 shadow-sm", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Trust Summary</div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            Overall confidence:{" "}
            <span className={cn("font-bold", overallTone)}>{overall}</span> out of 100
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="text-sm font-medium text-action hover:underline"
        >
          {open ? "Hide details" : "View details"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {Object.entries(trust.components).map(([key, component]) => (
            <div key={key} className="rounded-xl border border-border/40 bg-background/60 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">
                  {COMPONENT_LABELS[key] || key}
                </div>
                <div className={cn("text-xs uppercase tracking-widest", statusTone(component.status))}>
                  {component.status}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Score: <span className="font-semibold text-foreground">{formatScore(component.score)}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{component.notes}</div>
              {component.evidence?.length ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  Evidence: {component.evidence.join(", ")}
                </div>
              ) : null}
            </div>
          ))}
          {trust.applied_caps?.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800">
              <div className="font-semibold uppercase tracking-widest text-[10px]">Caps applied</div>
              <ul className="mt-2 space-y-1">
                {trust.applied_caps.map((cap) => (
                  <li key={cap.code}>
                    {cap.code} capped at {cap.max}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
