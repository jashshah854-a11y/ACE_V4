import { ArrowUpRight, ArrowDownRight, Activity, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorProps {
    label: string;
    value: string | number;
    trend?: "up" | "down" | "neutral";
    status?: "success" | "warning" | "risk" | "neutral";
    subtext?: string;
    icon?: React.ReactNode;
}

function KpiCard({ label, value, trend, status = "neutral", subtext, icon }: IndicatorProps) {
    // Apple Style: Minimal colors, focus on content hierarchy
    const statusColor = {
        success: "text-emerald-600",
        warning: "text-amber-600",
        risk: "text-rose-600",
        neutral: "text-primary"
    };

    return (
        <div className="group relative overflow-hidden rounded-[2rem] bg-card p-8 shadow-sm transition-all hover:shadow-md border border-border/50">
            <div className="flex flex-col h-full justify-between gap-6">

                {/* Header: Label + Status Icon */}
                <div className="flex items-start justify-between">
                    <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                        {label}
                    </span>
                    {icon && (
                        <div className="text-muted-foreground/20 group-hover:text-primary/10 transition-colors">
                            {icon}
                        </div>
                    )}
                </div>

                {/* Main Value */}
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl md:text-7xl font-bold tracking-tighter text-primary">
                            {value}
                        </span>
                        <span className="text-xl font-medium text-muted-foreground">
                            {typeof value === 'number' ? '%' : ''}
                        </span>
                    </div>

                    {/* Footer: Trend/Subtext */}
                    <div className="mt-4 flex items-center gap-3">
                        {trend && (
                            <div className={cn(
                                "flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full",
                                trend === "up" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700",
                                status === "neutral" && "hidden"
                            )}>
                                {trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                                {trend === "up" ? "Positive" : "Attention"}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground font-medium leading-tight">
                            {subtext}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface KeyPerformanceIndicatorsProps {
    confidence: number;
    quality: number;
    clusterCount?: number;
}

export function KeyPerformanceIndicators({ confidence = 0, quality = 0, clusterCount = 0 }: KeyPerformanceIndicatorsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <KpiCard
                label="Confidence"
                value={confidence}
                status={confidence > 80 ? "success" : confidence > 50 ? "warning" : "risk"}
                trend={confidence > 80 ? "up" : "down"}
                icon={<Zap className="w-8 h-8" />}
                subtext={confidence > 80 ? "High reliability" : "Low signal strength"}
            />

            <KpiCard
                label="Data Quality"
                value={quality}
                status={quality > 85 ? "success" : quality > 60 ? "warning" : "risk"}
                trend={quality > 85 ? "up" : "down"}
                icon={<ShieldCheck className="w-8 h-8" />}
                subtext={quality > 85 ? "Clean dataset" : "Missing fields"}
            />

            <KpiCard
                label="Segments"
                value={clusterCount}
                status="neutral"
                icon={<Activity className="w-8 h-8" />}
                subtext="Behavioral groups"
            />
        </div>
    );
}
