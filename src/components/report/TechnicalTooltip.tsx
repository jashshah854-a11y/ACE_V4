import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { getTooltip, TooltipDefinition } from "@/lib/tooltipDefinitions";
import { ReactNode } from "react";

interface TechnicalTooltipProps {
    term: string;
    children?: ReactNode;
    className?: string;
}

/**
 * Tooltip wrapper for technical terms
 * Shows plain language explanation on hover
 */
export function TechnicalTooltip({
    term,
    children,
    className
}: TechnicalTooltipProps) {
    const definition = getTooltip(term);

    if (!definition) {
        // No tooltip available, render children as-is
        return <>{children || term}</>;
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <span className={`border-b border-dashed border-muted-foreground/50 cursor-help ${className || ''}`}>
                        {children || term}
                        <HelpCircle className="inline h-3 w-3 ml-1 opacity-50" />
                    </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                        <p className="font-semibold">{definition.term}</p>
                        <p className="text-sm">{definition.explanation}</p>
                        {definition.example && (
                            <p className="text-xs text-muted-foreground italic">
                                Example: {definition.example}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

/**
 * Wrap text content and auto-add tooltips to known technical terms
 */
export function enrichWithTooltips(text: string): ReactNode {
    const terms = [
        'Silhouette Score',
        'R²',
        'R-Squared',
        'RMSE',
        'MAE',
        'Cluster',
        'Anomaly',
        'Persona',
        'Confidence Level',
        'Data Quality',
        'Feature Importance'
    ];

    let enrichedText: ReactNode = text;

    terms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const parts = text.split(regex);

        if (parts.length > 1) {
            enrichedText = parts.map((part, idx) => (
                <>
                    {part}
                    {idx < parts.length - 1 && (
                        <TechnicalTooltip key={`${term}-${idx}`} term={term}>
                            {term}
                        </TechnicalTooltip>
                    )}
                </>
            ));
        }
    });

    return enrichedText;
}
