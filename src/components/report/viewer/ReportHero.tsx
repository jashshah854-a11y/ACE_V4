// ReportHero.tsx - Cleaner version
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Shield } from "lucide-react"; // Added icons

interface ReportHeroProps {
  title: string;
  runId?: string;
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
  taskContractSummary,
  decisionSummary,
  runContext,
  narrativeSummary,
  primaryQuestion,
  onPdfExport,
}: ReportHeroProps) {
  return (
    <Card className="mb-8 p-6 border-0 shadow-sm bg-transparent">
      {/* Top Row: Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold text-deep-charcoal tracking-tight">{title}</h1>
            {runId && <Badge variant="secondary" className="font-mono text-[10px] opacity-70 tracking-wider hidden sm:inline-flex">{runId.slice(0, 8)}</Badge>}
          </div>

          {/* Metadata Row - Cleaner */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {runContext.freshness}</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> {runContext.mode} Mode</span>
          </div>
        </div>

        {onPdfExport && (
          <Button variant="ghost" size="icon" onClick={onPdfExport} className="text-muted-foreground hover:text-foreground">
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </div>

      {primaryQuestion && (
        <div className="mt-2 text-lg text-primary/80 font-medium leading-relaxed max-w-3xl">
          "{primaryQuestion}"
        </div>
      )}

      {/* Decision Summary - Minimalist */}
      {decisionSummary && (
        <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-muted/50 backdrop-blur-sm">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Bottom Line</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{decisionSummary}</p>
            </div>
            {taskContractSummary && (
              <div className="hidden md:block max-w-xs text-right opacity-60">
                <h3 className="text-[10px] uppercase font-semibold mb-1">Scope</h3>
                <p className="text-xs truncate">{taskContractSummary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Narrative grid - Keeping it but cleaning styling */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Strategic Wins</h4>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            {narrativeSummary.wins.slice(0, 3).map((w, i) => <li key={i} className="flex gap-2"><span className="text-teal-500">•</span> {w}</li>)}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Critical Risks</h4>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            {narrativeSummary.risks.slice(0, 3).map((r, i) => <li key={i} className="flex gap-2"><span className="text-amber-500">•</span> {r}</li>)}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Implications</h4>
          <ul className="text-sm space-y-1.5 text-muted-foreground">
            {narrativeSummary.meaning.slice(0, 3).map((m, i) => <li key={i} className="flex gap-2"><span className="text-indigo-500">•</span> {m}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}
