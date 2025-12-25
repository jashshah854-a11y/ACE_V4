import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Database,
    Shield,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportMetrics } from "@/lib/reportParser";
import { numberFormatter } from "@/lib/numberFormatter";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface MetricsCardsProps {
    metrics: ReportMetrics;
    className?: string;
}

/**
 * Animated count-up number component
 */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const spring = useSpring(0, { duration: 1000 });
    const display = useTransform(spring, (latest) => {
        if (suffix === '%') {
            return numberFormatter.decimal(latest, 1);
        }
        return numberFormatter.integer(Math.round(latest));
    });

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return (
        <div className="flex items-baseline">
            <motion.span className="text-3xl font-bold tracking-tight">
                {display}
            </motion.span>
            {suffix && (
                <span className="ml-1 text-xl text-muted-foreground">
                    {suffix}
                </span>
            )}
        </div>
    );
}

export function MetricsCards({ metrics, className }: MetricsCardsProps) {
    const cards = [
        {
            title: "Data Quality Score",
            value: metrics.dataQualityScore,
            suffix: "%",
            icon: CheckCircle2,
            color: getQualityColor(metrics.dataQualityScore),
            trend: getTrend(metrics.dataQualityScore, 85), // Compare to threshold
        },
        {
            title: "Records Processed",
            value: metrics.recordsProcessed,
            suffix: "",
            icon: Database,
            color: "text-blue-600",
        },
        {
            title: "Anomalies Detected",
            value: metrics.anomalyCount,
            suffix: "",
            icon: Shield,
            color: metrics.anomalyCount && metrics.anomalyCount > 0 ? "text-orange-600" : "text-green-600",
        },
        {
            title: "Confidence Level",
            value: metrics.confidenceLevel,
            suffix: "%",
            icon: TrendingUp,
            color: getConfidenceColor(metrics.confidenceLevel),
            trend: getTrend(metrics.confidenceLevel, 80),
        },
    ];

    // Filter out cards with no data
    const validCards = cards.filter(card => card.value !== undefined && card.value !== null);

    if (validCards.length === 0) {
        return null;
    }

    return (
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
            {validCards.map((card, index) => {
                const Icon = card.icon;
                const TrendIcon = card.trend === 'up' ? TrendingUp :
                    card.trend === 'down' ? TrendingDown : Minus;

                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.4 }}
                    >
                        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                                <Icon className={cn("h-4 w-4", card.color)} />
                            </CardHeader>
                            <CardContent>
                                <AnimatedNumber value={card.value!} suffix={card.suffix} />

                                {/* Trend Indicator */}
                                {card.trend && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <TrendIcon className={cn(
                                            "h-3 w-3",
                                            card.trend === 'up' && "text-green-600",
                                            card.trend === 'down' && "text-red-600",
                                            card.trend === 'neutral' && "text-gray-600"
                                        )} />
                                        <span className="text-xs text-muted-foreground">
                                            {card.trend === 'up' ? 'Above target' :
                                                card.trend === 'down' ? 'Below target' :
                                                    'At target'}
                                        </span>
                                    </div>
                                )}

                                {/* Progress Bar for Percentages */}
                                {card.suffix === "%" && renderProgressBar(card.value!)}
                            </CardContent>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}

function renderProgressBar(value: number) {
    const percentage = Math.min(100, Math.max(0, value));

    return (
        <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                        "h-full rounded-full",
                        percentage >= 90 ? "bg-green-500" :
                            percentage >= 70 ? "bg-yellow-500" :
                                "bg-red-500"
                    )}
                />
            </div>
        </div>
    );
}

function getQualityColor(score: number | undefined): string {
    if (score === undefined) return "text-gray-600";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
}

function getTrend(value: number | undefined, threshold: number): 'up' | 'down' | 'neutral' | undefined {
    if (value === undefined) return undefined;
    if (value >= threshold + 5) return 'up';
    if (value <= threshold - 5) return 'down';
    return 'neutral';
}

function getConfidenceColor(confidence: number | undefined): string {
    if (confidence === undefined) return "text-gray-600";
    if (confidence >= 85) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-orange-600";
}

function renderProgressRing(value: number, isPercentage: boolean) {
    if (!isPercentage) return null;

    const percentage = Math.min(100, Math.max(0, value));
    const circumference = 2 * Math.PI * 20; // radius = 20
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="mt-3">
            <svg className="w-full h-2" viewBox="0 0 100 6">
                <rect
                    x="0"
                    y="0"
                    width="100"
                    height="6"
                    rx="3"
                    className="fill-muted"
                />
                <rect
                    x="0"
                    y="0"
                    width={`${percentage}%`}
                    height="6"
                    rx="3"
                    className={cn(
                        "transition-all duration-500",
                        percentage >= 90 ? "fill-green-500" :
                            percentage >= 70 ? "fill-yellow-500" :
                                "fill-red-500"
                    )}
                />
            </svg>
        </div>
    );
}
