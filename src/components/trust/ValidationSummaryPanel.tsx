
import { AlertTriangle, Shield, EyeOff, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationIssue {
    type: "warning" | "error" | "info";
    message: string;
}

interface ValidationSummaryPanelProps {
    dataQualityScore: number; // 0-1
    issues?: ValidationIssue[];
    suppressedCount?: number;
    className?: string;
    insightPolicy?: "endorsed" | "limited" | "blocked";
}

export function ValidationSummaryPanel({
    dataQualityScore,
    issues = [],
    suppressedCount = 0,
    className,
    insightPolicy = "endorsed",
}: ValidationSummaryPanelProps) {

    const isHighQuality = dataQualityScore > 0.8;
    const isLowQuality = dataQualityScore < 0.5;
    const hasErrors = issues.some((issue) => issue.type === "error");
    const hasWarnings = issues.some((issue) => issue.type === "warning");
    const statusLabel = hasErrors ? "Failed" : hasWarnings ? "Borderline" : "Passed";
    const policyLabel = insightPolicy === "endorsed"
        ? "Endorsed insights"
        : insightPolicy === "limited"
            ? "Allowed with guardrails"
            : "Blocked by policy";

    return (
        <div className={cn("rounded-lg border bg-card p-4 text-sm shadow-sm", className)}>
            <div className="flex items-center gap-2 font-medium text-foreground mb-3">
                <Shield className={cn("w-4 h-4", isHighQuality ? "text-emerald-500" : isLowQuality ? "text-rose-500" : "text-amber-500")} />
                Governance & Validation
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Validation Status</span>
                    <span className={cn("font-mono font-medium", hasErrors ? "text-rose-600" : hasWarnings ? "text-amber-600" : "text-emerald-600")}>
                        {statusLabel}
                    </span>
                </div>
                {/* Quality Score Indicator */}
                <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Data Quality Assessment</span>
                    <span className={cn("font-mono font-medium", isHighQuality ? "text-emerald-600" : "text-amber-600")}>
                        {(dataQualityScore * 100).toFixed(0)}%
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", isHighQuality ? "bg-emerald-500" : isLowQuality ? "bg-rose-500" : "bg-amber-500")}
                        style={{ width: `${dataQualityScore * 100}%` }}
                    />
                </div>

                {/* Issues List */}
                {issues.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
                        {issues.map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                                <span>{issue.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between text-muted-foreground text-xs border-t border-border/50 pt-3">
                    <span>Insight Policy</span>
                    <span className="font-medium text-foreground">{policyLabel}</span>
                </div>

                {/* Suppressed Insights */}
                {suppressedCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-3">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{suppressedCount} insights suppressed due to low confidence</span>
                    </div>
                )}

                {issues.length === 0 && suppressedCount === 0 && isHighQuality && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600/80 mt-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>All validation checks passed</span>
                    </div>
                )}
            </div>
        </div>
    );
}
