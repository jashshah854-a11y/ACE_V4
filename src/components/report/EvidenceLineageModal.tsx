import React from "react";
import { X } from "lucide-react";
import type { EvidenceSummary } from "@/types/reportTypes";
import { Button } from "@/components/ui/button";

interface EvidenceLineageModalProps {
  evidence: EvidenceSummary | null;
  onClose: () => void;
}

export function EvidenceLineageModal({
  evidence,
  onClose,
}: EvidenceLineageModalProps) {
  if (!evidence) return null;

  const { title, method, columns, dataSource, sourceNotes, sourceCode } =
    evidence;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Evidence Lineage
            </p>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close lineage modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-6 overflow-y-auto px-6 py-5 text-sm">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Method
            </p>
            <p className="font-serif text-[17px] text-foreground">
              {method ?? "Not specified"}
            </p>
          </div>
          <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 md:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Columns
              </p>
              <p className="font-mono text-xs text-foreground">
                {columns && columns.length ? columns.join(", ") : "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Data Source
              </p>
              <p className="font-mono text-xs text-foreground">
                Data Source: {dataSource || "Artifact"}
              </p>
            </div>
          </div>
          {sourceNotes && (
            <div className="rounded-xl border border-blue-500/40 bg-blue-500/5 p-4 text-sm text-blue-900 dark:text-blue-100">
              <p className="text-[11px] uppercase tracking-widest text-blue-500">
                Notes
              </p>
              <p className="mt-1 text-foreground">{sourceNotes}</p>
            </div>
          )}
          {sourceCode && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Code
              </p>
              <pre className="max-h-72 overflow-auto rounded-xl bg-zinc-950/90 p-4 text-xs text-zinc-100">
                <code>{sourceCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
