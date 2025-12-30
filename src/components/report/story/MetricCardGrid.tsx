import { MetricCardData } from "@/lib/ReportViewModel";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardGridProps {
    metrics: MetricCardData[];
}

export function MetricCardGrid({ metrics }: MetricCardGridProps) {
    if (!metrics || metrics.length === 0) return null;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {metrics.map((metric, idx) => (
                <div
                    key={idx}
                    className={cn(
                        "p-5 rounded-2xl border bg-card/50 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                        metric.status === "success" && "border-teal-200 dark:border-teal-900",
                        metric.status === "warning" && "border-amber-200 dark:border-amber-900",
                        metric.status === "risk" && "border-rose-200 dark:border-rose-900",
                        metric.status === "neutral" && "border-border"
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {metric.label}
                        </span>
                        {metric.icon && <metric.icon className="w-4 h-4 text-muted-foreground opacity-70" />}
                    </div>

                    <div className="flex items-end gap-2">
                        <span className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-foreground">
                            {metric.value}
                        </span>

                        {metric.trend && metric.trend !== "neutral" && (
                            <div className={cn(
                                "flex items-center text-xs font-medium mb-1.5",
                                metric.trend === "up" ? "text-teal-500" : "text-rose-500"
                            )}>
                                {metric.trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
