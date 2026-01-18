import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrustScore } from "@/types/trust";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrustBadgeProps {
  trust: TrustScore;
  className?: string;
  showScore?: boolean;
}

export function TrustBadge({ trust, className, showScore = false }: TrustBadgeProps) {
  const label = trust.band === "certified"
    ? "Certified"
    : trust.band === "conditional"
      ? "Conditionally Trusted"
      : "Caution";

  const toneClass = trust.band === "certified"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : trust.band === "conditional"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  const content = (
    <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide border", toneClass, className)}>
      {label}
      {showScore && (
        <span className="ml-2 font-mono text-[10px] opacity-70">{Math.round(trust.score * 100)}%</span>
      )}
    </Badge>
  );

  if (!trust.certification?.certified) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="text-xs max-w-xs">
          Certified · {trust.certification.rulesetVersion} · Score {Math.round(trust.score * 100)}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
