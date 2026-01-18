import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustScore } from "@/types/trust";
import type { NarrativeMode } from "@/types/StoryTypes";
import { recordTrustHistory, getTrustTrend } from "@/lib/trustHistory";

interface TrustBreakdownProps {
  trust: TrustScore;
  mode: NarrativeMode;
  insightId?: string;
  className?: string;
}

export function TrustBreakdown({ trust, mode, insightId, className }: TrustBreakdownProps) {
  const [expanded, setExpanded] = useState(false);
  const [trend, setTrend] = useState<ReturnType<typeof getTrustTrend> | null>(null);

  useEffect(() => {
    if (!insightId) return;
    recordTrustHistory(insightId, trust);
    setTrend(getTrustTrend(insightId));
  }, [insightId, trust]);

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card/40", className)}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Trust Breakdown
        </span>
        {trend && trend.trend !== "flat" && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {trend.trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-amber-600" />}
            {trend.trend === "up" ? "Improving" : "Declining"}
          </span>
        )}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 px-3 py-3 text-xs text-muted-foreground space-y-3">
          {mode === "executive" && (
            <p>{trust.factors.join(" ") || "Trust factors are still being evaluated."}</p>
          )}

          {mode === "analyst" && (
            <div className="space-y-2">
              <div>
                <div className="font-semibold text-foreground">Positive contributors</div>
                <ul className="mt-1 space-y-1">
                  {trust.positives.map((item, idx) => (
                    <li key={`pos-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-foreground">Negative contributors</div>
                <ul className="mt-1 space-y-1">
                  {trust.negatives.map((item, idx) => (
                    <li key={`neg-${idx}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {mode === "expert" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>Data quality: {Math.round(trust.components.dataQuality * 100)}%</div>
                <div>Validation: {trust.components.validation > 0.5 ? "Pass" : "Fail"}</div>
                <div>Sample sufficiency: {Math.round(trust.components.sampleSize * 100)}%</div>
                <div>Signal stability: {Math.round(trust.components.stability * 100)}%</div>
                <div>Feature dominance: {Math.round(trust.components.featureDominance * 100)}%</div>
                <div>Assumption risk: {Math.round(trust.components.assumptionRisk * 100)}%</div>
              </div>
              {trust.risks.length > 0 && (
                <div>
                  <div className="font-semibold text-foreground">Dominant risks</div>
                  <ul className="mt-1 space-y-1">
                    {trust.risks.map((item, idx) => (
                      <li key={`risk-${idx}`}>- {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {trust.improvements.length > 0 && (
            <div>
              <div className="font-semibold text-foreground">What would improve trust</div>
              <ul className="mt-1 space-y-1">
                {trust.improvements.map((item, idx) => (
                  <li key={`imp-${idx}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}

          {trust.certification.certified && (
            <div className="text-[11px] text-emerald-700">
              Certified ({trust.certification.rulesetVersion})
              {trust.certification.certifiedAt ? ` · ${trust.certification.certifiedAt}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
