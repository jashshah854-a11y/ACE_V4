import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Info, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
            color: "text-warning",
            bg: "bg-warning/8",
            border: "border-warning/20",
            label: "High Impact"
        },
        medium: {
            color: "text-info",
            bg: "bg-info/8",
            border: "border-info/20",
            label: "Medium Impact"
        },
        low: {
            color: "text-success",
            bg: "bg-success/8",
            border: "border-success/20",
            label: "Low Impact"
        }
    };

    const trendConfig = {
        positive: {
            icon: TrendingUp,
            color: "text-success",
            label: "Positive Trend"
        },
        negative: {
            icon: TrendingDown,
            color: "text-warning",
            label: "Negative Trend"
        },
        neutral: {
            icon: Minus,
            color: "text-muted-foreground",
            label: "Neutral Trend"
        }
    };

    const config = impactConfig[impact];
    const trendInfo = trendConfig[trend];
    const TrendIcon = trendInfo.icon;

    const getConfidenceLevel = (score: number) => {
        if (score >= 85) return { label: "Very High", color: "bg-success" };
        if (score >= 70) return { label: "High", color: "bg-info" };
        if (score >= 50) return { label: "Moderate", color: "bg-warning" };
        return { label: "Low", color: "bg-destructive/80" };
    };

    const confidenceInfo = getConfidenceLevel(confidence);
    const qualityInfo = getConfidenceLevel(dataQuality);

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <Card className={cn(
                    "relative overflow-hidden border shadow-soft-lg",
                    config.border,
                    config.bg
                )}>
                    {/* Subtle background decoration */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary/3 to-accent/3 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative p-6 md:p-8 space-y-6">
                        {/* Header with badges */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className={cn("p-2.5 rounded-xl", config.bg)}
                                >
                                    <Info className={cn("h-5 w-5", config.color)} />
                                </motion.div>
                                <div className="space-y-1">
                                    <Badge variant="outline" className={cn("font-medium text-xs", config.color, "border-current/30")}>
                                        {config.label}
                                    </Badge>
                                    <div className="flex items-center gap-1.5">
                                        <TrendIcon className={cn("h-3.5 w-3.5", trendInfo.color)} />
                                        <span className={cn("text-xs font-medium", trendInfo.color)}>
                                            {trendInfo.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Confidence & Quality indicators */}
                            <div className="flex gap-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-right cursor-help">
                                            <div className="text-xs text-muted-foreground mb-1.5">Confidence</div>
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-1.5 w-14 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${confidence}%` }}
                                                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                                                        className={cn("h-full rounded-full", confidenceInfo.color)}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold tabular-nums">{confidence}%</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{confidenceInfo.label}</div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">How confident the model is in these findings</p>
                                    </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-right cursor-help">
                                            <div className="text-xs text-muted-foreground mb-1.5">Data Quality</div>
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-1.5 w-14 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${dataQuality}%` }}
                                                        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                                                        className={cn("h-full rounded-full", qualityInfo.color)}
                                                    />
                                                </div>
                                                <span className="text-sm font-semibold tabular-nums">{dataQuality}%</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">{qualityInfo.label}</div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p className="text-xs">Completeness and accuracy of your dataset</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Key Insight - The Hero Statement */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="space-y-3"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
                                {keyInsight}
                            </h2>
                            {context && (
                                <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                                    {context}
                                </p>
                            )}
                        </motion.div>

                        {/* Recommendation */}
                        <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="pt-5 border-t border-border/40"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                                        Recommended Action
                                    </h3>
                                    <p className="text-sm md:text-base font-medium text-foreground leading-relaxed">
                                        {recommendation}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Card>
            </motion.div>
        </TooltipProvider>
    );
}
