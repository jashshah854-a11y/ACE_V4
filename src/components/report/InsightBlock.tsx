import { ReactNode } from "react";

interface VisualConfig {
  type: string;
  title: string;
  description?: string;
  confidence?: number;
  render: () => ReactNode;
}

interface EvidenceObject {
  id: string;
  summary: string;
}

interface InsightBlockProps {
  narrativeText: string;
  evidenceObject: EvidenceObject;
  visualConfig: VisualConfig;
}

export function InsightBlock({ narrativeText, visualConfig }: InsightBlockProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground">{visualConfig.title}</h4>
        {visualConfig.confidence !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {visualConfig.confidence}% confidence
          </span>
        )}
      </div>
      {visualConfig.description && (
        <p className="text-xs text-muted-foreground">{visualConfig.description}</p>
      )}
      <div className="w-full">{visualConfig.render()}</div>
      <p className="text-sm text-muted-foreground leading-relaxed">{narrativeText}</p>
    </div>
  );
}
