import { TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "positive" | "neutral" | "warning" | "risk";

export interface InsightCaptionProps {
    text: string;
    severity?: InsightSeverity;
    confidence?: number;
    className?: string;
}

/**
 * InsightCaption - One-line plain language takeaway
 * 
 * Displays under charts to provide immediate interpretation.
 * Supports severity indicators and confidence levels.
 */
export function InsightCaption({
    text,
    severity = "neutral",
    confidence,
    className,
}: InsightCaptionProps) {
    const severityConfig = {
        positive: {
            icon: CheckCircle,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50/50",
            borderColor: "border-emerald-200/50",
        },
        neutral: {
            icon: TrendingUp,
            color: "text-blue-600",
            bgColor: "bg-blue-50/50",
            borderColor: "border-blue-200/50",
        },
        warning: {
            icon: AlertCircle,
            color: "text-amber-600",
            bgColor: "bg-amber-50/50",
            borderColor: "border-amber-200/50",
        },
        risk: {
            icon: AlertCircle,
            color: "text-rose-600",
            bgColor: "bg-rose-50/50",
            borderColor: "border-rose-200/50",
        },
    };

    const config = severityConfig[severity];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-sm",
                config.bgColor,
                config.borderColor,
                className
            )}
        >
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", config.color)} />
            <div className="flex-1 space-y-1">
                <p className="font-medium text-foreground leading-snug">{text}</p>
                {confidence !== undefined && (
                    <p className="text-xs text-muted-foreground">
                        Confidence: {Math.round(confidence)}%
                    </p>
                )}
            </div>
        </div>
    );
}
