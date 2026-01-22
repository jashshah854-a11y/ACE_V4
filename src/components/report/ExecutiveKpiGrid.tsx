
import { Activity, Shield, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiMetric {
    label: string;
    value: string | number;
    unit?: string;
    subValue?: string;
    trend?: "up" | "down" | "neutral";
    icon?: React.ElementType;
    className?: string;
    tooltip?: string;
}

interface ExecutiveKpiGridProps {
    metrics: KpiMetric[];
}

export function ExecutiveKpiGrid({ metrics }: ExecutiveKpiGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metrics.map((metric, idx) => {
                const Icon = metric.icon || Activity;
                return (
                    <div
                        key={idx}
                        className={cn(
                            "p-5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:border-primary/20",
                            "group relative cursor-default", // Added group for tooltip
                            metric.className
                        )}
                    >
                        {metric.tooltip && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center">
                                {metric.tooltip}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                                {metric.label}
                            </p>
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                <Icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-foreground font-serif tracking-tight">
                                {metric.value}
                            </span>
                            {metric.unit && (
                                <span className="text-sm text-muted-foreground font-medium self-end mb-1">
                                    {metric.unit}
                                </span>
                            )}
                            {metric.subValue && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                    {metric.subValue}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
