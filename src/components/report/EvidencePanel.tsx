import { Card } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface EvidencePanelProps {
  records: Record<string, any> | null;
}

export function EvidencePanel({ records }: EvidencePanelProps) {
  if (!records || Object.keys(records).length === 0) {
    return null;
  }

  return (
    <Card className="p-3 space-y-3">
      <div className="text-sm font-semibold">Evidence Locker</div>
      <div className="space-y-2 text-xs">
        {Object.values(records).map((record: any) => (
          <Tooltip key={record.evidence_id}>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between rounded border px-2 py-1">
                <div>
                  <div className="font-medium">{record.computation_method}</div>
                  <div className="text-muted-foreground">Evidence {record.evidence_id}</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Columns</p>
              <p className="mb-1 text-muted-foreground">{(record.columns_used || []).join(", ")}</p>
              <p className="font-semibold mb-1">Result</p>
              <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(record.result_statistic, null, 2)}</pre>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </Card>
  );
}
