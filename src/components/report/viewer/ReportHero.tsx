import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StreamingText } from "@/components/ui/StreamingText";
import { Download, FileText } from "lucide-react";
import { ConfidenceSignal } from "@/components/report/ConfidenceSignal";
import { ReportViewModel } from "@/lib/reportViewModel";

interface ReportHeroProps {
  title: string;
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
  onPdfExport?: () => void;
}

export function ReportHero({
  title,
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
  onPdfExport,
}: ReportHeroProps) {
  return (
    <Card className="mb-8 p-6 border-0 shadow-sm bg-transparent">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-serif font-bold text-deep-charcoal tracking-tight">{title}</h1>
          <ConfidenceSignal signal={signal} limitationsReason={limitationsReason} />
        </div>
        <div className="flex items-center gap-2">
          {onPdfExport && (
            <Button variant="ghost" size="sm" onClick={onPdfExport} className="text-muted-foreground hover:text-foreground">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          )}
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
          <div className="text-sm whitespace-pre-line text-slate-700 dark:text-slate-300">
            {decisionSummary ? (
              <StreamingText text={decisionSummary} speed={20} />
            ) : "Scope not provided."}
          </div>
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
