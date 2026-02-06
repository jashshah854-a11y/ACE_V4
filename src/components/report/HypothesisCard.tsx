import { cn } from "@/lib/utils";
import { AlertCircle, HelpCircle, Zap } from "lucide-react";
import type { Hypothesis } from "@/lib/types";

const TYPE_CONFIG = {
  charitable: {
    icon: HelpCircle,
    label: "Charitable",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  suspicious: {
    icon: AlertCircle,
    label: "Suspicious",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  wild: {
    icon: Zap,
    label: "Wild",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
};

export function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const config = TYPE_CONFIG[hypothesis.hypothesis_type] || TYPE_CONFIG.charitable;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5",
        hypothesis.is_red_flag
          ? "border-red-500/30 bg-red-500/5"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center",
              config.bg,
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", config.color)} />
          </div>
          <span className={cn("text-xs font-medium uppercase tracking-wider", config.color)}>
            {config.label}
          </span>
          {hypothesis.is_red_flag && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              Red Flag
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                hypothesis.confidence >= 7
                  ? "bg-green-500"
                  : hypothesis.confidence >= 4
                    ? "bg-yellow-500"
                    : "bg-red-500",
              )}
              style={{ width: `${(hypothesis.confidence / 10) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {hypothesis.confidence}/10
          </span>
        </div>
      </div>

      <h4 className="font-medium text-sm mb-2">{hypothesis.finding_title}</h4>
      <p className="text-sm text-foreground/80 leading-relaxed">
        {hypothesis.hypothesis}
      </p>
    </div>
  );
}
