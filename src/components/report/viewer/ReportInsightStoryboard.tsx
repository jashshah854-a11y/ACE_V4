import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Section {
  id: string;
  title: string;
  content: string;
}

interface ReportInsightStoryboardProps {
  sections: Section[];
  confidenceLevel: number | undefined;
  safeMode: boolean;
  hideActions: boolean;
  getSectionLimitations: (section: Section) => string[];
  onInspectEvidence: (payload: { content: string; id?: string; title?: string }) => void;
}

export function ReportInsightStoryboard({
  sections,
  confidenceLevel,
  safeMode,
  hideActions,
  getSectionLimitations,
  onInspectEvidence,
}: ReportInsightStoryboardProps) {
  if (sections.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Narrative</div>
          <div className="text-sm font-semibold">Insight Storyboard</div>
        </div>
        <Badge variant="outline">Curated</Badge>
      </div>
      <div className="space-y-3">
        {sections
          .slice(0, 6)
          .sort((a, b) => (a.title.toLowerCase().includes("insight") ? -1 : 1))
          .map((sec, idx) => {
            const limitationNotes = getSectionLimitations(sec);
            return (
              <div key={idx} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{sec.title}</div>
                  <Badge variant="secondary">Confidence: {confidenceLevel ?? "n/a"}%</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sec.content}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Evidence-linked</Badge>
                  {!hideActions && <Badge variant="outline">Actionable</Badge>}
                  {safeMode && (
                    <Badge variant="outline" className="border-amber-500 text-amber-700">
                      Safe Mode
                    </Badge>
                  )}
                </div>
                {limitationNotes.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    {limitationNotes.map((note, nIdx) => (
                      <div key={nIdx}>Limitation: {note}</div>
                    ))}
                  </div>
                )}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onInspectEvidence({ content: sec.content, id: sec.id, title: sec.title })}
                  >
                    Inspect evidence
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </Card>
  );
}
