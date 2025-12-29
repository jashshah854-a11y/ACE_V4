import { cn } from "@/lib/utils";

export type ConfidenceLevel = "high" | "moderate" | "exploratory" | "low";

interface ConfidenceIndicatorProps {
    level: ConfidenceLevel;
    score?: number;
    reasoning?: {
        data_completeness?: number;
        method_robustness?: string;
        consistency_score?: number;
    };
    className?: string;
    showLabel?: boolean;
}

const CONFIDENCE_CONFIG = {
    high: {
        icon: "●●●",
        label: "High confidence",
        color: "text-[hsl(var(--lab-signal))]",
        description: "Strong evidence supports this finding",
    },
    moderate: {
        icon: "●●○",
        label: "Moderate confidence",
        color: "text-[hsl(var(--library-accent))]",
        description: "Evidence suggests this pattern",
    },
    exploratory: {
        icon: "●○○",
        label: "Exploratory",
        color: "text-[hsl(var(--library-muted))]",
        description: "Preliminary observation requiring validation",
    },
    low: {
        icon: "○○○",
        label: "Low confidence",
        color: "text-[hsl(var(--lab-alert))]",
        description: "Insufficient evidence for this claim",
    },
};

export function ConfidenceIndicator({
    level,
    score,
    reasoning,
    className,
    showLabel = false,
}: ConfidenceIndicatorProps) {
    const config = CONFIDENCE_CONFIG[level];

    return (
        <div className={cn("inline-flex items-center gap-2", className)}>
            {/* Signal Icons */}
            <span
                className={cn(
                    "font-[family-name:var(--font-lab)] text-sm tracking-wider",
                    config.color
                )}
                title={config.description}
            >
                {config.icon}
            </span>

            {/* Optional Label */}
            {showLabel && (
                <span className="text-xs text-[hsl(var(--library-muted))] font-medium">
                    {config.label}
                </span>
            )}

            {/* Optional Score */}
            {score !== undefined && (
                <span className="text-xs text-[hsl(var(--library-muted))] font-[family-name:var(--font-lab)]">
                    ({Math.round(score * 100)}%)
                </span>
            )}

            {/* Tooltip with reasoning (if provided) */}
            {reasoning && (
                <div className="hidden group-hover:block absolute z-10 bg-[hsl(var(--lab-charcoal))] text-[hsl(var(--lab-silver))] p-3 rounded-lg shadow-lg text-xs font-[family-name:var(--font-lab)] min-w-[200px] mt-2">
                    <div className="space-y-1">
                        <div className="font-medium text-[hsl(var(--lab-signal))]">Confidence Reasoning</div>
                        {reasoning.data_completeness !== undefined && (
                            <div>
                                Data completeness: {Math.round(reasoning.data_completeness * 100)}%
                            </div>
                        )}
                        {reasoning.method_robustness && (
                            <div>Method robustness: {reasoning.method_robustness}</div>
                        )}
                        {reasoning.consistency_score !== undefined && (
                            <div>
                                Consistency: {Math.round(reasoning.consistency_score * 100)}%
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility function to determine confidence level from score
export function getConfidenceLevelFromScore(score: number): ConfidenceLevel {
    if (score >= 0.75) return "high";
    if (score >= 0.5) return "moderate";
    if (score >= 0.3) return "exploratory";
    return "low";
}
