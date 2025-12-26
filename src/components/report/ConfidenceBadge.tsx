import { ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  value?: number;
  label?: string;
  className?: string;
}

const levelConfig = {
  high: {
    className: "bg-emerald-600 text-white",
    text: "High confidence",
    Icon: ShieldCheck,
  },
  medium: {
    className: "border border-amber-400 text-amber-700 bg-amber-50",
    text: "Medium confidence",
    Icon: AlertTriangle,
  },
  low: {
    className: "border border-slate-200 text-slate-500 bg-slate-50",
    text: "Low certainty",
    Icon: AlertTriangle,
  },
  unknown: {
    className: "border border-slate-300 text-slate-500 bg-transparent",
    text: "Confidence pending",
    Icon: HelpCircle,
  },
} as const;

export function ConfidenceBadge({ value, label, className }: ConfidenceBadgeProps) {
  const level = (() => {
    if (typeof value !== "number" || Number.isNaN(value)) return "unknown" as const;
    if (value > 90) return "high" as const;
    if (value >= 70) return "medium" as const;
    return "low" as const;
  })();

  const config = levelConfig[level];
  const Icon = config.Icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide",
            config.className,
            level === "low" && "italic",
            className
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label && <span className="hidden sm:inline">{label}:</span>}
          <span>{typeof value === "number" ? `${value}%` : "n/a"}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs">
          {config.text}
          {level === "medium" && " — watch for weak signals."}
          {level === "low" && " — Low Certainty"}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
