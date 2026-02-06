import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    const impactConfig = {
        high: {
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950/20",
            border: "border-red-200 dark:border-red-800",
            icon: AlertTriangle,
            label: "High Impact"
        },
        medium: {
            color: "text-yellow-600 dark:text-yellow-400",
            bg: "bg-yellow-50 dark:bg-yellow-950/20",
            border: "border-yellow-200 dark:border-yellow-800",
            icon: Info,
            label: "Medium Impact"
        },
        low: {
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/20",
            border: "border-green-200 dark:border-green-800",
            icon: CheckCircle,
            label: "Low Impact"
        }
    };

    const trendConfig = {
        positive: {
            icon: TrendingUp,
            color: "text-green-600 dark:text-green-400",
            label: "Positive"
        },
        negative: {
            icon: TrendingDown,
            color: "text-red-600 dark:text-red-400",
            label: "Negative"
        },
        neutral: {
            icon: Minus,
            color: "text-slate-600 dark:text-slate-400",
            label: "Neutral"
        }
    };

    const config = impactConfig[impact];
    const trendInfo = trendConfig[trend];
    const TrendIcon = trendInfo.icon;
    const ImpactIcon = config.icon;

    const getConfidenceLabel = (score: number) => {
        if (score >= 90) return { label: "Very High", color: "bg-green-500" };
        if (score >= 70) return { label: "High", color: "bg-blue-500" };
        if (score >= 50) return { label: "Moderate", color: "bg-yellow-500" };
        return { label: "Low", color: "bg-orange-500" };
    };

    const confidenceInfo = getConfidenceLabel(confidence);
    const qualityInfo = getConfidenceLabel(dataQuality);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <Card className={cn(
                "relative overflow-hidden border-2 shadow-xl",
                config.border,
                config.bg
            )}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />

                <div className="relative p-8 space-y-6">
                    {/* Header with badges */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-3 rounded-xl", config.bg)}>
                                <ImpactIcon className={cn("h-6 w-6", config.color)} />
                            </div>
                            <div>
                                <Badge variant="outline" className={cn("font-semibold", config.color)}>
                                    {config.label}
                                </Badge>
                                <div className="flex items-center gap-2 mt-1">
                                    <TrendIcon className={cn("h-4 w-4", trendInfo.color)} />
                                    <span className={cn("text-xs font-medium", trendInfo.color)}>
                                        {trendInfo.label} Trend
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Confidence & Quality indicators */}
                        <div className="flex gap-3">
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full", confidenceInfo.color)}
                                            style={{ width: `${confidence}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold">{confidence}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{confidenceInfo.label}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground mb-1">Data Quality</div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full", qualityInfo.color)}
                                            style={{ width: `${dataQuality}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-semibold">{dataQuality}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{qualityInfo.label}</div>
                            </div>
                        </div>
                    </div>

                    {/* Key Insight - The Hero Statement */}
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                            {keyInsight}
                        </h2>
                        {context && (
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                {context}
                            </p>
                        )}
                    </div>

                    {/* Recommendation - What to do */}
                    <div className="pt-4 border-t border-border/50">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-2 rounded-lg bg-primary/10">
                                <CheckCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                                    Recommended Action
                                </h3>
                                <p className="text-base font-medium text-foreground">
                                    {recommendation}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
