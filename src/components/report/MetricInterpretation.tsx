import { Info, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MetricInterpretationProps {
    metricName: string;
    value: number | string;
    interpretation: string;
    benchmark?: string;
    confidenceLevel?: "high" | "medium" | "low";
    helpText?: string;
    className?: string;
}

export function MetricInterpretation({
    metricName,
    value,
    interpretation,
    benchmark,
    confidenceLevel,
    helpText,
    className
}: MetricInterpretationProps) {
    const confidenceColors = {
        high: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        low: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">{metricName}:</span>
                <span className="text-lg font-bold text-foreground">{value}</span>
                {confidenceLevel && (
                    <Badge variant="secondary" className={cn("text-xs", confidenceColors[confidenceLevel])}>
                        {confidenceLevel} confidence
                    </Badge>
                )}
                {helpText && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
                                    <HelpCircle className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-sm">{helpText}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm text-foreground leading-relaxed">{interpretation}</p>
                    {benchmark && (
                        <p className="text-xs text-muted-foreground">
                            Benchmark: {benchmark}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

interface MetricGridProps {
    metrics: {
        name: string;
        value: number | string;
        interpretation: string;
        benchmark?: string;
        confidenceLevel?: "high" | "medium" | "low";
        helpText?: string;
    }[];
}

export function MetricGrid({ metrics }: MetricGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((metric, index) => (
                <MetricInterpretation key={index} {...metric} />
            ))}
        </div>
    );
}

export function interpretSilhouetteScore(score: number): string {
    if (score >= 0.71) return "Excellent clustering - segments are strongly distinct and well-separated";
    if (score >= 0.51) return "Good clustering - segments are reasonably well-defined with clear differences";
    if (score >= 0.26) return "Moderate clustering - some segment overlap exists, refinement may help";
    return "Weak clustering - significant overlap between segments, consider different features";
}

export function interpretR2Score(score: number): string {
    if (score >= 0.9) return "Excellent fit - model explains 90%+ of variance in outcomes";
    if (score >= 0.7) return "Good fit - model captures most key patterns and relationships";
    if (score >= 0.5) return "Moderate fit - model captures some patterns but may miss key drivers";
    if (score >= 0) return "Poor fit - model struggles to explain outcomes, key features may be missing";
    return "Negative fit - model performs worse than baseline, suggesting wrong target or features";
}

export function interpretDataQuality(score: number): string {
    if (score >= 95) return "Exceptional quality - data is clean, complete, and highly reliable";
    if (score >= 85) return "High quality - minimal issues, suitable for confident decision-making";
    if (score >= 70) return "Good quality - some minor issues but generally trustworthy";
    if (score >= 50) return "Moderate quality - notable gaps or inconsistencies, use with caution";
    return "Low quality - significant data issues, insights should be validated externally";
}
