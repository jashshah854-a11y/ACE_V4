import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SignalWidget } from "../trust/SignalWidget";

export interface EvidenceObject {
    id: string;
    summary?: string;
    sourceFields?: string[];
}

export interface VisualConfig {
    type: "line" | "bar" | "gauge" | "pie" | "table" | "spark";
    title: string;
    description?: string;
    render: () => ReactNode;
    confidence?: number;
}

interface InsightBlockProps {
    narrativeText?: string;
    evidenceObject?: EvidenceObject;
    visualConfig: VisualConfig;
    className?: string;
}

export function InsightBlock({ narrativeText, evidenceObject, visualConfig, className }: InsightBlockProps) {
    const hasNarrative = Boolean(narrativeText && narrativeText.trim().length > 0);
    const hasEvidence = Boolean(evidenceObject?.id);

    if (!hasNarrative || !hasEvidence) {
        console.error("Orphaned Visual Error: visual attempted without narrative + evidence.");
        return (
            <Card className={cn("border-destructive/40 bg-destructive/5 p-4", className)}>
                <div className="text-sm font-semibold text-destructive">Orphaned Visual Error</div>
                <p className="text-xs text-muted-foreground mt-1">
                    Charts must be linked to a narrative finding and evidence reference. Provide narrativeText and evidenceObject.id to render this block.
                </p>
            </Card>
        );
    }

    return (
        <Card className={cn("p-4 space-y-4 border border-border/60", className)}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="uppercase tracking-wide text-[10px]">{visualConfig.type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">Evidence {evidenceObject!.id}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{narrativeText}</p>
                    {evidenceObject?.summary && (
                        <p className="mt-1 text-xs text-muted-foreground">{evidenceObject.summary}</p>
                    )}
                    {evidenceObject?.sourceFields?.length ? (
                        <div className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                            Source Fields: {evidenceObject.sourceFields.slice(0, 3).join(", ")}
                            {evidenceObject.sourceFields.length > 3 ? "…" : ""}
                        </div>
                    ) : null}
                </div>
                <SignalWidget score={(visualConfig.confidence || 0) / 100} compact={true} />
            </div>

            {visualConfig.description && (
                <p className="text-xs text-muted-foreground">{visualConfig.description}</p>
            )}

            <div className="rounded-lg border border-dashed border-border/50 p-3 bg-muted/40">
                {visualConfig.render()}
            </div>
        </Card>
    );
}
