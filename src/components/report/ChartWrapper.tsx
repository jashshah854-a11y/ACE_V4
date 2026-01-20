import { ReactNode } from "react";
import { Database, Calendar, Users, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { InsightCaption, InsightSeverity } from "./InsightCaption";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ChartWrapperProps {
    title: string;
    questionAnswered?: string;
    source?: string;
    dateRange?: string;
    sampleSize?: number;
    confidence?: number;
    chart: ReactNode;
    caption?: {
        text: string;
        severity?: InsightSeverity;
    };
    metricDefinitions?: Record<string, string>;
    className?: string;
}

/**
 * ChartWrapper - Enforces chart metadata and context
 * 
 * Wraps charts with required context:
 * - Title and question
 * - Data source badge
 * - Confidence indicator
 * - Sample size
 * - Insight caption
 * - Metric definitions tooltip
 */
export function ChartWrapper({
    title,
    questionAnswered,
    source,
    dateRange,
    sampleSize,
    confidence,
    chart,
    caption,
    metricDefinitions,
    className,
}: ChartWrapperProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {/* Chart Header */}
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                        {questionAnswered && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {questionAnswered}
                            </p>
                        )}
                    </div>

                    {/* Metric Definitions Tooltip */}
                    {metricDefinitions && Object.keys(metricDefinitions).length > 0 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="p-1 rounded-md hover:bg-muted transition-colors">
                                        <Info className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                    <div className="space-y-2">
                                        <p className="font-semibold text-xs">Metric Definitions:</p>
                                        {Object.entries(metricDefinitions).map(([key, value]) => (
                                            <div key={key} className="text-xs">
                                                <span className="font-medium">{key}:</span>{" "}
                                                <span className="text-muted-foreground">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {source && (
                        <div className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            <span>{source}</span>
                        </div>
                    )}
                    {dateRange && (
                        <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{dateRange}</span>
                        </div>
                    )}
                    {sampleSize !== undefined && (
                        <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{sampleSize.toLocaleString()} records</span>
                        </div>
                    )}
                    {confidence !== undefined && (
                        <div
                            className={cn(
                                "px-2 py-0.5 rounded-full font-medium",
                                confidence >= 80
                                    ? "bg-emerald-100 text-emerald-700"
                                    : confidence >= 60
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-700"
                            )}
                        >
                            {Math.round(confidence)}% confidence
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Content */}
            <div className="rounded-lg border border-border/40 bg-background p-4">
                {chart}
            </div>

            {/* Insight Caption */}
            {caption && (
                <InsightCaption
                    text={caption.text}
                    severity={caption.severity}
                    confidence={confidence}
                />
            )}
        </div>
    );
}
