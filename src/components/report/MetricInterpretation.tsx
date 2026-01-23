import { Info, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricInterpretationProps {
    metricName: string;
    value: number | string;
    interpretation: string;
    benchmark?: string;
    helpText?: string;
    className?: string;
}

export function MetricInterpretation({
    metricName,
    value,
    interpretation,
    benchmark,
    helpText,
    className
}: MetricInterpretationProps) {
    return (
        <Card className={cn("p-4 transition-all duration-200 hover:shadow-md hover:border-primary/20 group", className)}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{metricName}</span>
                    {helpText && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-1 rounded-full hover:bg-accent text-muted-foreground/70 hover:text-primary transition-colors">
                                        <HelpCircle className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-popover text-popover-foreground shadow-xl border">
                                    <p className="text-sm leading-relaxed">{helpText}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded bg-muted/30 text-sm group-hover:bg-muted/50 transition-colors">
                    <Info className="h-4 w-4 text-primary/80 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1 w-full">
                        <p className="text-foreground/90 leading-snug">{interpretation}</p>
                        {benchmark && (
                            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border/50">
                                <span className="text-[10px] bg-primary/10 text-primary px-1 rounded uppercase font-semibold tracking-wider">Goal</span>
                                <span className="text-xs text-muted-foreground">{benchmark}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}

interface MetricGridProps {
    metrics: {
        name: string;
        value: number | string;
        interpretation: string;
        benchmark?: string;
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
