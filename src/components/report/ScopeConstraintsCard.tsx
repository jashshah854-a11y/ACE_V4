import { Info } from "lucide-react";
import type { ScopeConstraintDisplay } from "@/types/analysisIntent";
import { cn } from "@/lib/utils";

interface ScopeConstraintsCardProps {
  constraints: ScopeConstraintDisplay[];
  className?: string;
}

export function ScopeConstraintsCard({ constraints, className }: ScopeConstraintsCardProps) {
  if (!constraints || constraints.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-border/40 bg-card/70 p-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-3">
        <Info className="h-3.5 w-3.5" />
        Scope constraints
      </div>
      <div className="space-y-3 text-sm">
        {constraints.map((constraint, index) => (
          <div key={`${constraint.title}-${index}`} className="rounded-lg border border-border/30 bg-background/70 p-3">
            <div className="font-semibold text-foreground">{constraint.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{constraint.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
