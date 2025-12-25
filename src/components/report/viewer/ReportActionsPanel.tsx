import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Action {
  title?: string;
  description?: string;
  confidence?: number;
}

interface ReportActionsPanelProps {
  actions: Action[];
  hideActions: boolean;
  confidenceLevel: number | undefined;
  showAllActions: boolean;
  onToggleShowAll: () => void;
}

export function ReportActionsPanel({
  actions,
  hideActions,
  confidenceLevel,
  showAllActions,
  onToggleShowAll,
}: ReportActionsPanelProps) {
  if (actions.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Actions</div>
          <div className="text-sm font-semibold">Impact x Confidence (Top 3)</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onToggleShowAll}>
          {showAllActions ? "Hide full list" : "Expand full list"}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.slice(0, 3).map((a, idx) => (
          <div key={idx} className={cn("border rounded-md p-2 text-sm", hideActions && "opacity-60")}>
            <div className="font-semibold">{a.title || `Action ${idx + 1}`}</div>
            <div className="text-xs text-muted-foreground line-clamp-2">{a.description || String(a)}</div>
            <div className="mt-1 text-xs">Confidence: {a.confidence ?? confidenceLevel ?? "n/a"}%</div>
            {hideActions && <div className="text-xs text-amber-700">Hidden in strict mode</div>}
          </div>
        ))}
      </div>
      {showAllActions && actions.length > 3 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {actions.slice(3).map((a, idx) => (
            <div key={idx} className="border rounded-md p-2 text-sm">
              <div className="font-semibold">{a.title || `Action ${idx + 4}`}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{a.description || String(a)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface Segment {
  label?: string;
  subtitle?: string;
  count?: number;
  mean?: number;
  uplift?: number;
}

interface ReportPersonasPanelProps {
  segments: Segment[];
  showAllPersonas: boolean;
  onToggleShowAll: () => void;
}

export function ReportPersonasPanel({ segments, showAllPersonas, onToggleShowAll }: ReportPersonasPanelProps) {
  if (segments.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Personas</div>
          <div className="text-sm font-semibold">Top Segments</div>
        </div>
        <Button size="sm" variant="ghost" onClick={onToggleShowAll}>
          {showAllPersonas ? "Hide all segments" : "See all segments"}
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {segments.slice(0, 3).map((seg, idx) => (
          <Card key={idx} className="p-3">
            <div className="text-sm font-semibold">{seg.label || `Segment ${idx + 1}`}</div>
            <div className="text-xs text-muted-foreground">{seg.subtitle || "Data-driven segment"}</div>
            {seg.count && <div className="mt-1 text-xs text-muted-foreground">Size: {seg.count}</div>}
            {seg.mean && <div className="mt-1 text-xs text-muted-foreground">Mean: {Math.round(seg.mean)}</div>}
            {seg.uplift && <div className="mt-1 text-xs text-muted-foreground">Uplift: {Math.round(seg.uplift)}%</div>}
          </Card>
        ))}
      </div>
      {showAllPersonas && segments.length > 3 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {segments.slice(3).map((seg, idx) => (
            <div key={idx} className="border rounded-md p-2 text-sm">
              <div className="font-semibold">{seg.label || `Segment ${idx + 4}`}</div>
              <div className="text-xs text-muted-foreground">{seg.subtitle || "Segment"}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
