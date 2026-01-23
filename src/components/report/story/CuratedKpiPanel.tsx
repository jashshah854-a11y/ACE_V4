import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CuratedKpiCardData } from "@/types/reportTypes";

interface CuratedKpiPanelProps {
  kpis: CuratedKpiCardData[];
  loading?: boolean;
  sourceLabel?: string;
  highlightColor?: string;
  onViewEvidence?: (payload: { section: string; evidenceId?: string }) => void;
}

export function CuratedKpiPanel({
  kpis,
  loading,
  sourceLabel,
  highlightColor,
  onViewEvidence,
}: CuratedKpiPanelProps) {
  const hasData = kpis && kpis.length > 0;

  if (!hasData && !loading) return null;

  const cards = hasData
    ? kpis
    : Array.from({ length: 3 }, (_, idx) => ({ id: `placeholder-${idx}` }));
  const evidenceTone = highlightColor || "rgb(0,94,184)";

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Curated KPIs
          </p>
          <h3 className="text-2xl font-semibold text-foreground">
            Signal Summary
          </h3>
        </div>
        {sourceLabel && (
          <Badge
            variant="outline"
            className="text-xs font-medium px-3 py-1 rounded-full"
          >
            {sourceLabel}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card, idx) => {
          if (!hasData) {
            return (
              <div
                key={`kpi-skeleton-${idx}`}
                className="rounded-3xl border border-border/40 bg-muted/30 h-40 animate-pulse"
              />
            );
          }

          return (
            <article
              key={card.id}
              className={cn(
                "rounded-3xl border px-6 py-5 bg-card shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:shadow-md",
                statusTone(card.status),
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                </div>
                <TrendBadge trend={card.trend} />
              </div>

              <div className="mt-4">
                <p className="text-4xl font-semibold tracking-tight text-foreground">
                  {card.value}
                </p>
                {card.deltaLabel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.deltaLabel}
                  </p>
                )}
              </div>

              {card.description && (
                <p className="text-sm text-muted-foreground/80 mt-4 leading-snug">
                  {card.description}
                </p>
              )}

              {onViewEvidence && (
                <button
                  type="button"
                  onClick={() =>
                    onViewEvidence({
                      section: "business_intelligence",
                      evidenceId: card.evidenceId || card.id,
                    })
                  }
                  className="mt-4 text-[11px] uppercase tracking-[0.35em] font-semibold"
                  style={{ color: evidenceTone }}
                >
                  View Source
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function statusTone(status?: CuratedKpiCardData["status"]) {
  switch (status) {
    case "success":
      return "border-emerald-300/60 dark:border-emerald-900/60";
    case "warning":
      return "border-amber-300/70 dark:border-amber-900/70";
    case "risk":
      return "border-rose-300/70 dark:border-rose-900/70";
    default:
      return "border-border/60";
  }
}

function TrendBadge({ trend }: { trend?: CuratedKpiCardData["trend"] }) {
  if (!trend || trend === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
        <Minus className="w-3 h-3" />
        Stable
      </span>
    );
  }

  const isUp = trend === "up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
        isUp
          ? "bg-emerald-500/10 text-emerald-600"
          : "bg-rose-500/10 text-rose-600",
      )}
    >
      {isUp ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {isUp ? "Improving" : "Declining"}
    </span>
  );
}
