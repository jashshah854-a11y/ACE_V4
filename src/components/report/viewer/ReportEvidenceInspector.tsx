import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EvidenceSection {
  id: string;
  title: string;
  content: string;
}

interface ReportEvidenceInspectorProps {
  evidenceSections: EvidenceSection[];
  evidencePreview: string | null;
  evidenceSample: any[] | null;
  evidenceLoading: boolean;
  evidenceError: string | null;
  onFetchEvidenceSample: (contentSnippet: string, evidenceId?: string) => void;
  onCloseEvidence: () => void;
}

export function ReportEvidenceInspector({
  evidenceSections,
  evidencePreview,
  evidenceSample,
  evidenceLoading,
  evidenceError,
  onFetchEvidenceSample,
  onCloseEvidence,
}: ReportEvidenceInspectorProps) {
  if (evidenceSections.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Evidence Inspector</div>
          <div className="text-sm font-semibold">Click to inspect evidence</div>
        </div>
      </div>
      <div className="space-y-2">
        {evidenceSections.map((sec, idx) => (
          <div key={idx} className="flex items-start gap-3 border rounded-md p-2">
            <div className="text-xs font-semibold text-muted-foreground">#{idx + 1}</div>
            <div className="flex-1">
              <div className="text-sm font-medium">{sec.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{sec.content}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFetchEvidenceSample(sec.content, sec.id)}
            >
              Inspect
            </Button>
          </div>
        ))}
      </div>
      {evidencePreview && (
        <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-semibold mb-1">Sample Rows</div>
          {evidenceLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
          {evidenceError && <div className="text-xs text-red-600">{evidenceError}</div>}
          {evidenceSample && evidenceSample.length > 0 && (
            <pre className="mt-2 text-xs whitespace-pre-wrap">{JSON.stringify(evidenceSample, null, 2)}</pre>
          )}
          {!evidenceLoading && !evidenceSample && !evidenceError && (
            <div className="text-xs text-muted-foreground">No sample returned.</div>
          )}
          <div className="mt-2">
            <Button size="sm" onClick={onCloseEvidence}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
