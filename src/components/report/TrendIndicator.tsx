import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
    current: number;
    previous?: number;
    metric?: string;
    format?: "number" | "percentage" | "decimal";
    invertColors?: boolean; // For metrics where lower is better (e.g., anomalies)
}

export function TrendIndicator({
    current,
    previous,
    metric,
    format = "number",
    invertColors = false,
}: TrendIndicatorProps) {
    if (previous === undefined || previous === null) {
        return (
            <div className="text-xs text-muted-foreground">
                No previous data
            </div>
        );
    }

    const change = current - previous;
    const percentChange = previous !== 0 ? ((change / previous) * 100) : 0;

    const isPositive = change > 0;
    const isNegative = change < 0;
    const isNeutral = change === 0;

    // Determine color based on direction and whether lower is better
    const getColor = () => {
        if (isNeutral) return "text-muted-foreground";

        if (invertColors) {
            return isPositive ? "text-red-600" : "text-green-600";
        } else {
            return isPositive ? "text-green-600" : "text-red-600";
        }
    };

    const getIcon = () => {
        if (isNeutral) return Minus;
        return isPositive ? TrendingUp : TrendingDown;
    };

    const formatValue = (val: number) => {
        switch (format) {
            case "percentage":
                return `${val.toFixed(1)}%`;
            case "decimal":
                return val.toFixed(2);
            default:
                return val.toLocaleString();
        }
    };

    const Icon = getIcon();
    const color = getColor();

    return (
        <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-1 text-xs font-medium", color)}>
                <Icon className="h-3 w-3" />
                <span>
                    {Math.abs(percentChange).toFixed(1)}%
                </span>
            </div>
            <span className="text-xs text-muted-foreground">
                vs last run
            </span>
            {metric && (
                <span className="text-xs text-muted-foreground">
                    ({formatValue(previous)} → {formatValue(current)})
                </span>
            )}
        </div>
    );
}

/**
 * Mini sparkline chart for showing trends
 */
interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    className?: string;
}

export function Sparkline({ data, width = 60, height = 20, className }: SparklineProps) {
    if (data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    const points = data
        .map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
            return `${x},${y}`;
        })
        .join(" ");

    const lastValue = data[data.length - 1];
    const firstValue = data[0];
    const isIncreasing = lastValue > firstValue;

    return (
        <svg
            width={width}
            height={height}
            className={cn("inline-block", className)}
            aria-label="Trend sparkline"
        >
            <polyline
                fill="none"
                stroke={isIncreasing ? "#10B981" : "#EF4444"}
                strokeWidth="1.5"
                points={points}
            />
        </svg>
    );
}
