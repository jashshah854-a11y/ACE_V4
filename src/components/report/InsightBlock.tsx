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
    viewMode?: "story" | "technical";
}

export function InsightBlock({ narrativeText, evidenceObject, visualConfig, className, viewMode = "story" }: InsightBlockProps) {
    const hasNarrative = Boolean(narrativeText && narrativeText.trim().length > 0);
    const hasEvidence = Boolean(evidenceObject?.id);

    // ... (keep error handling)

    if (viewMode === "story") {
        return (
            <Card className={cn("p-6 space-y-6 border-none shadow-sm bg-card/50", className)}>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg leading-relaxed font-serif text-slate-800 dark:text-slate-200">
                        {narrativeText}
                    </p>
                </div>

                <div className="rounded-xl border border-border/40 p-1 bg-muted/20">
                    <div className="bg-card rounded-lg p-4">
                        {/* Simplified Visual Header */}
                        <div className="mb-4">
                            <h4 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                                {visualConfig.title}
                            </h4>
                            {visualConfig.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{visualConfig.description}</p>
                            )}
                        </div>
                        {visualConfig.render()}
                    </div>
                </div>
            </Card>
        );
    }

    // Technical Mode (Original)
    return (
        <Card className={cn("p-4 space-y-4 border border-border/60", className)}>
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="uppercase tracking-wide text-[10px]">{visualConfig.type}</Badge>
                        <Badge variant="secondary" className="text-[10px]">Evidence {evidenceObject!.id}</Badge>
                    </div>
                    {/* ... rest of original rendering code ... */}

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
