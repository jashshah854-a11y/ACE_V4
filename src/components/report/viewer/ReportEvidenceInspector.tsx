import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, FileJson, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RawDataTable } from "../RawDataTable";
import { Badge } from "@/components/ui/badge";

interface ReportEvidenceInspectorProps {
  evidenceSections: any[];
  evidencePreview: string | null;
  evidenceSample: any[] | null;
  evidenceLoading: boolean;
  evidenceError: string | null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFetchEvidenceSample: (params: { contentSnippet: string; evidenceId?: string; sectionTitle?: string }) => void;
  onCloseEvidence: () => void;
}

export function ReportEvidenceInspector({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  evidenceSections,
  evidencePreview,
  evidenceSample,
  evidenceLoading,
  evidenceError,
  onCloseEvidence,
}: ReportEvidenceInspectorProps) {
  if (!evidencePreview && !evidenceSample && !evidenceLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed bottom-4 right-4 z-40 w-[480px] max-w-[90vw] shadow-2xl"
      >
        <Card className="flex flex-col h-[600px] border-l-4 border-l-primary overflow-hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Evidence Inspector</h3>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] font-mono">
                LIVE QUERY
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCloseEvidence}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Context Snippet */}
            {evidencePreview && (
              <div className="p-3 bg-muted/30 rounded-md text-xs italic border-l-2 border-primary/20">
                "{evidencePreview}"
              </div>
            )}

            {/* Loading State */}
            {evidenceLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Fetching records from trace...</span>
              </div>
            )}

            {/* Error State */}
            {evidenceError && (
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                {evidenceError}
              </div>
            )}

            {/* Data Table */}
            {evidenceSample && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Returned {evidenceSample.length} records
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Full Dataset
                  </Button>
                </div>
                <RawDataTable
                  data={evidenceSample}
                  className="border-slate-200 dark:border-slate-800 shadow-sm"
                />
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
