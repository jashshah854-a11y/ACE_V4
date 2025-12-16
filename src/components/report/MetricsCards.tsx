import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Database,
    Shield,
    CheckCircle2,
    TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportMetrics } from "@/lib/reportParser";

interface MetricsCardsProps {
    metrics: ReportMetrics;
    className?: string;
}

export function MetricsCards({ metrics, className }: MetricsCardsProps) {
    const cards = [
        {
            title: "Data Quality Score",
            value: metrics.dataQualityScore,
            suffix: "%",
            icon: CheckCircle2,
            color: getQualityColor(metrics.dataQualityScore),
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
                const displayValue = formatValue(card.value);

                return (
                    <Card key={index} className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </CardTitle>
                            <Icon className={cn("h-4 w-4", card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold tracking-tight">
                                    {displayValue}
                                </span>
                                {card.suffix && (
                                    <span className="ml-1 text-xl text-muted-foreground">
                                        {card.suffix}
                                    </span>
                                )}
                            </div>
                            {card.value !== undefined && renderProgressRing(card.value, card.suffix === "%")}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function formatValue(value: number | undefined): string {
    if (value === undefined || value === null) return "-";

    // Format large numbers with K/M suffixes
    if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
        return (value / 1000).toFixed(1) + "K";
    }

    // Format decimals
    if (value % 1 !== 0) {
        return value.toFixed(1);
    }

    return value.toString();
}

function getQualityColor(score: number | undefined): string {
    if (score === undefined) return "text-gray-600";
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
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
