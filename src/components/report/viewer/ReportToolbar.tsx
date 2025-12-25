import { Button } from "@/components/ui/button";
import { Copy, FileDown } from "lucide-react";
import { PDFExporter } from "../PDFExporter";

interface ReportToolbarProps {
  runId?: string;
  copied: boolean;
  diffRunId: string;
  diffLoading: boolean;
  pptxLoading: boolean;
  onCopy: () => void;
  onDownloadMarkdown: () => void;
  onRunDiff: () => void;
  onPptxExport: () => void;
  onDiffRunIdChange: (value: string) => void;
}

export function ReportToolbar({
  runId,
  copied,
  diffRunId,
  diffLoading,
  pptxLoading,
  onCopy,
  onDownloadMarkdown,
  onRunDiff,
  onPptxExport,
  onDiffRunIdChange,
}: ReportToolbarProps) {
  return (
    <div className="flex gap-2 justify-end flex-wrap mt-8 mb-6">
      <Button onClick={onCopy} variant="outline" size="sm" className="gap-2">
        <Copy className="h-4 w-4" />
        {copied ? "Copied!" : "Copy"}
      </Button>

      <Button onClick={onDownloadMarkdown} variant="outline" size="sm" className="gap-2">
        <FileDown className="h-4 w-4" />
        Download MD
      </Button>

      <PDFExporter
        contentId="report-content"
        filename={runId ? `ace-report-${runId}.pdf` : "ace-report.pdf"}
      />

      <Button onClick={onRunDiff} variant="outline" size="sm" className="gap-2">
        {diffLoading ? "Diffing..." : "Run Diff"}
      </Button>

      <input
        className="h-9 rounded-md border px-2 text-sm bg-background"
        placeholder="Compare run ID"
        value={diffRunId}
        onChange={(e) => onDiffRunIdChange(e.target.value)}
      />

      <Button onClick={onPptxExport} variant="outline" size="sm" className="gap-2">
        {pptxLoading ? "Exporting..." : "PPTX"}
      </Button>
    </div>
  );
}
