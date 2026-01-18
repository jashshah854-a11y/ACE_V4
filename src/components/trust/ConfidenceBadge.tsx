
import { Shield, HelpCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export type ConfidenceLevel = "high" | "medium" | "low";

interface ConfidenceBadgeProps {
    level: ConfidenceLevel;
    score?: number; // 0-1 (e.g., 0.85) or 0-100
    className?: string;
    showLabel?: boolean;
    details?: {
        dataCoverage?: string;
        validationStatus?: string;
        sampleSufficiency?: string;
        scopeNote?: string;
    };
}

export function ConfidenceBadge({ level, score, className, showLabel = true, details }: ConfidenceBadgeProps) {
    const config = {
        high: {
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20",
            icon: CheckCircle,
            label: "High Confidence",
            desc: "Robust data breadth and consistency."
        },
        medium: {
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20",
            icon: HelpCircle, // Or a dash/dot
            label: "Medium Confidence",
            desc: "Some data gaps or variance detected."
        },
        low: {
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/20",
            icon: AlertTriangle,
            label: "Low Confidence",
            desc: "Significant uncertainty. Validation recommended."
        }
    };

    const current = config[level] || config.medium;
    const displayScore = score !== undefined ? (score <= 1 ? Math.round(score * 100) : score) : null;
    const resolvedDetails = details ?? buildDetails(level, displayScore);

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium cursor-help transition-colors",
                        current.bg,
                        current.color,
                        current.border,
                        className
                    )}>
                        <current.icon className="w-3 h-3" />
                        {showLabel && <span>{current.label}</span>}
                        {displayScore !== null && (
                            <span className="opacity-70 border-l border-current pl-1.5 ml-0.5">
                                {displayScore}%
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <Shield className={cn("w-4 h-4", current.color)} />
                            {current.label} {displayScore !== null && `(${displayScore}%)`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {current.desc}
                        </p>
                        <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 space-y-1">
                            <div>Data coverage: {resolvedDetails.dataCoverage}</div>
                            <div>Validation: {resolvedDetails.validationStatus}</div>
                            <div>Sample sufficiency: {resolvedDetails.sampleSufficiency}</div>
                            {resolvedDetails.scopeNote ? (
                                <div>Scope: {resolvedDetails.scopeNote}</div>
                            ) : null}
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function buildDetails(level: ConfidenceLevel, displayScore: number | null) {
    const score = typeof displayScore === "number" ? displayScore : undefined;
    const dataCoverage = level === "high"
        ? "Broad coverage across key fields"
        : level === "medium"
            ? "Mixed coverage, some gaps"
            : "Sparse coverage, notable gaps";
    const validationStatus = score !== undefined && score >= 80
        ? "Passed core checks"
        : score !== undefined && score >= 60
            ? "Borderline checks"
            : "Requires validation";
    const sampleSufficiency = level === "high"
        ? "Sufficient sample size"
        : level === "medium"
            ? "Sample size needs review"
            : "Limited sample size";

    return {
        dataCoverage,
        validationStatus,
        sampleSufficiency,
    };
}
