import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceSignal } from "@/components/report/ConfidenceSignal";
import { ReportViewModel } from "@/lib/reportViewModel";

interface ReportHeroProps {
  runId?: string;
  safeMode: boolean;
  confidenceLevel: number | undefined;
  signal: ReportViewModel['header']['signal'];
  limitationsReason?: string | null;
  taskContractSummary?: string;
  decisionSummary?: string;
  runContext: { mode: string; freshness: string; scopeLimits: string[] };
  narrativeSummary: { wins: string[]; risks: string[]; meaning: string[] };
  primaryQuestion?: string;
}

export function ReportHero({
  runId,
  safeMode,
  confidenceLevel,
  signal,
  limitationsReason,
  taskContractSummary,
  decisionSummary,
  runContext,
  narrativeSummary,
  primaryQuestion,
}: ReportHeroProps) {
  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Report</div>
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold">Executive Pulse</div>
            <ConfidenceSignal signal={signal} limitationsReason={limitationsReason} />
          </div>
          {runId && <div className="text-xs text-muted-foreground">Run ID: {runId}</div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Removed old badges as requested */}
        </div>
      </div>
      {primaryQuestion && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="text-[11px] uppercase tracking-wide text-primary font-semibold">Primary Decision Question</div>
          <p className="text-sm text-primary dark:text-white mt-1">
            {primaryQuestion}
          </p>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Card className="p-3 bg-muted/50">
          <div className="text-xs uppercase text-muted-foreground">Task Contract</div>
          <div className="text-sm whitespace-pre-line">{taskContractSummary || "Contract not provided."}</div>
        </Card>
        <Card className="p-3 bg-muted/50">
          <div className="text-xs uppercase text-muted-foreground">Scope / Decision</div>
          <div className="text-sm whitespace-pre-line">{decisionSummary || "Scope not provided."}</div>
        </Card>
      </div>

      {/* Run context strip */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary">Mode: {runContext.mode}</Badge>
        <Badge variant="secondary">Freshness: {runContext.freshness}</Badge>
        {runContext.scopeLimits.map((lim, idx) => (
          <Badge key={idx} variant="outline">
            {lim}
          </Badge>
        ))}
      </div>

      {/* Narrative summary */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card className="p-3 bg-muted/40">
          <div className="text-xs uppercase text-muted-foreground">Key Wins</div>
          <ul className="mt-1 text-sm space-y-1">
            {narrativeSummary.wins.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-3 bg-muted/40">
          <div className="text-xs uppercase text-muted-foreground">Risks</div>
          <ul className="mt-1 text-sm space-y-1">
            {narrativeSummary.risks.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-3 bg-muted/40">
          <div className="text-xs uppercase text-muted-foreground">What This Means</div>
          <ul className="mt-1 text-sm space-y-1">
            {narrativeSummary.meaning.map((m, i) => (
              <li key={i}>• {m}</li>
            ))}
          </ul>
        </Card>
      </div>
    </Card>
  );
}
