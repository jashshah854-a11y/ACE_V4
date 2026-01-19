import { Info } from "lucide-react";
import type { AnalysisIntent, ScopeConstraintDisplay, TargetCandidate } from "@/types/analysisIntent";
import { cn } from "@/lib/utils";

interface ScopePlaceholderProps {
  sectionName: string;
  agentKey: string;
  scopeConstraints: ScopeConstraintDisplay[];
  analysisIntent?: AnalysisIntent;
  targetCandidate?: TargetCandidate;
  className?: string;
}

export function ScopePlaceholder({
  sectionName,
  agentKey,
  scopeConstraints,
  analysisIntent,
  targetCandidate,
  className,
}: ScopePlaceholderProps) {
  const matching = scopeConstraints.find((constraint) => constraint?.agent === agentKey);
  const targetMissing = targetCandidate ? !targetCandidate.detected : false;
  const fallbackDetail = analysisIntent === "exploratory"
    ? "This run focuses on descriptive intelligence rather than predictions."
    : targetMissing
      ? "A target outcome column is required for this section."
      : "This section is not available for the current dataset.";
  const resolved = matching
    ? { title: matching.title, detail: matching.detail }
    : {
        title: "Not applicable for this run",
        detail: `${fallbackDetail} The report focuses on descriptive intelligence.`,
      };

  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/70 p-5 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
        <Info className="h-3.5 w-3.5" />
        {sectionName}
      </div>
      <div className="text-base font-semibold text-foreground">{resolved.title}</div>
      <p className="text-sm text-muted-foreground mt-2">{resolved.detail}</p>
      <p className="text-xs text-muted-foreground mt-3">
        What to do next: add an outcome column or broaden data coverage if predictive insights are required.
      </p>
    </div>
  );
}
