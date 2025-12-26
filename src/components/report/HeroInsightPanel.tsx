import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface HeroInsightPanelProps {
    keyInsight: string;
    impact: "high" | "medium" | "low";
    trend: "positive" | "negative" | "neutral";
    confidence: number;
    dataQuality: number;
    recommendation: string;
    context?: string;
}

export function HeroInsightPanel({
    keyInsight,
    impact,
    trend,
    confidence,
    dataQuality,
    recommendation,
    context
}: HeroInsightPanelProps) {
    // Null safety - return empty if no insight
    if (!keyInsight) {
        return null;
    }

    // Safe defaults for all values
    const safeImpact = impact || "medium";
    const safeTrend = trend || "neutral";
    const safeConfidence = typeof confidence === 'number' ? confidence : 0;
    const safeDataQuality = typeof dataQuality === 'number' ? dataQuality : 0;
    const safeRecommendation = recommendation || "Review the data for more insights";

    const impactConfig: Record<string, { color: string; bg: string; border: string; label: string; gradient: string }> = {
        high: {
            color: "text-copper-600",
            bg: "bg-copper-50",
            border: "border-copper-200",
            label: "High Impact",
            gradient: "from-copper-50 to-transparent"
        },
        medium: {
            color: "text-teal-600",
            bg: "bg-teal-50",
            border: "border-teal-200",
            label: "Medium Impact",
            gradient: "from-teal-50 to-transparent"
        },
        low: {
            color: "text-muted-foreground",
            bg: "bg-muted",
            border: "border-border",
            label: "Low Impact",
            gradient: "from-muted to-transparent"
        }
    };

    const trendConfig: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
        positive: {
            icon: TrendingUp,
            color: "text-teal-500",
            label: "Positive Trend"
        },
        negative: {
            icon: TrendingDown,
            color: "text-copper-500",
            label: "Negative Trend"
        },
        neutral: {
            icon: Minus,
            color: "text-muted-foreground",
            label: "Neutral Trend"
        }
    };

    const config = impactConfig[safeImpact] || impactConfig.medium;
    const trendInfo = trendConfig[safeTrend] || trendConfig.neutral;
    const TrendIcon = trendInfo.icon;

    const getQualityLabel = (score: number) => {
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Good";
        if (score >= 50) return "Fair";
        return "Needs Improvement";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
        >
            {/* Main Card */}
            <div className={cn(
                "relative overflow-hidden border rounded-sm shadow-soft bg-card",
                config.border
            )}>
                {/* Subtle gradient overlay */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
                    config.gradient
                )} />

                <div className="relative">
                    {/* Header with badges and stats */}
                    <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-border/50">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            {/* Left: Impact + Trend */}
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
                                    config.bg, config.color
                                )}>
                                    <Sparkles className="h-3 w-3" />
                                    {config.label}
                                </div>
                                <div className={cn(
                                    "flex items-center gap-1.5 text-xs font-medium",
                                    trendInfo.color
                                )}>
                                    <TrendIcon className="h-3.5 w-3.5" />
                                    {trendInfo.label}
                                </div>
                            </div>

                            {/* Right: Quality metrics */}
                            <div className="flex items-center gap-6">
                            <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2 justify-end">
                                        <span>Confidence</span>
                                        <ConfidenceBadge value={safeConfidence} className="px-2 py-0" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${safeConfidence}%` }}
                                                transition={{ duration: 0.8, delay: 0.2 }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    safeConfidence >= 70 ? "bg-teal-500" : safeConfidence >= 50 ? "bg-copper-400" : "bg-muted-foreground"
                                                )}
                                            />
                                        </div>
                                        <span className="text-sm font-bold tabular-nums">{safeConfidence}%</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2 justify-end">
                                        <span>Data Quality</span>
                                        <ConfidenceBadge value={safeDataQuality} label="Quality" className="px-2 py-0" />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${safeDataQuality}%` }}
                                                transition={{ duration: 0.8, delay: 0.3 }}
                                                className={cn(
                                                    "h-full rounded-full",
                                                    safeDataQuality >= 70 ? "bg-teal-500" : safeDataQuality >= 50 ? "bg-copper-400" : "bg-muted-foreground"
                                                )}
                                            />
                                        </div>
                                        <span className="text-sm font-bold tabular-nums">{safeDataQuality}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Insight */}
                    <div className="px-6 sm:px-8 py-6 sm:py-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            <p className="text-muted-foreground text-sm font-medium mb-2">
                                {getQualityLabel(safeDataQuality)} data quality foundation
                            </p>
                            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 leading-tight tracking-tight">
                                {keyInsight}
                            </h2>
                            {context && (
                                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed mt-4">
                                    {context}
                                </p>
                            )}
                        </motion.div>
                    </div>

                    {/* Recommendation */}
                    <motion.div 
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="px-6 sm:px-8 py-5 border-t border-border/50 bg-muted/30"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-sm bg-navy-900 shrink-0">
                                <Lightbulb className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[10px] uppercase tracking-wider text-copper-600 font-bold mb-1">
                                    Recommended Action
                                </h3>
                                <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed">
                                    {recommendation}
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-copper-400 shrink-0 hidden sm:block" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
