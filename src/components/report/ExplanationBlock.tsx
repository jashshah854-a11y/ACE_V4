import { Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExplanationBlockProps {
    what: string;
    shows: string;
    why: string;
    how?: string;
    notes?: string;
    limits?: string;
    tokens?: Record<string, string>;
    className?: string;
}

/**
 * ExplanationBlock - Standardized section explanation with micro-copy
 * 
 * Provides consistent structure for explaining:
 * - What this section is
 * - What it shows
 * - Why it matters
 * Optional: how to read it, data notes, limitations
 * 
 * Supports token replacement for dynamic content like {metric_name}
 */
export function ExplanationBlock({
    what,
    shows,
    why,
    how,
    notes,
    limits,
    tokens = {},
    className,
}: ExplanationBlockProps) {
    // Replace tokens in text
    const replaceTokens = (text: string): string => {
        let result = text;
        Object.entries(tokens).forEach(([key, value]) => {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
        return result;
    };

    return (
        <div className={cn("space-y-3 rounded-xl bg-muted/30 p-4 text-sm", className)}>
            {/* What this is */}
            <div>
                <span className="font-semibold text-foreground">What this is: </span>
                <span className="text-muted-foreground">{replaceTokens(what)}</span>
            </div>

            {/* What it shows */}
            <div>
                <span className="font-semibold text-foreground">What it shows: </span>
                <span className="text-muted-foreground">{replaceTokens(shows)}</span>
            </div>

            {/* Why it matters */}
            <div>
                <span className="font-semibold text-foreground">Why it matters: </span>
                <span className="text-muted-foreground">{replaceTokens(why)}</span>
            </div>

            {/* Optional: How to read it */}
            {how && (
                <div className="pt-2 border-t border-border/40">
                    <span className="font-semibold text-foreground">How to read it: </span>
                    <span className="text-muted-foreground">{replaceTokens(how)}</span>
                </div>
            )}

            {/* Optional: Data notes */}
            {notes && (
                <div className="flex items-start gap-2 pt-2 border-t border-border/40">
                    <Info className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                        <span className="font-semibold text-foreground">Data notes: </span>
                        <span className="text-muted-foreground">{replaceTokens(notes)}</span>
                    </div>
                </div>
            )}

            {/* Optional: Limitations */}
            {limits && (
                <div className="flex items-start gap-2 pt-2 border-t border-border/40">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                    <div>
                        <span className="font-semibold text-foreground">Limits: </span>
                        <span className="text-muted-foreground">{replaceTokens(limits)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
