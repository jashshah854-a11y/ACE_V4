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
    const statusColor = {
        success: "text-teal-600 bg-teal-50 border-teal-100",
        warning: "text-amber-600 bg-amber-50 border-amber-100",
        risk: "text-rose-600 bg-rose-50 border-rose-100",
        neutral: "text-navy-900 bg-white border-border"
    };

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-md",
            statusColor[status]
        )}>
            {/* Background Icon Watermark */}
            <div className="absolute -right-4 -top-4 opacity-[0.05] scale-150 transform transition-transform group-hover:scale-175">
                {icon}
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold uppercase tracking-wider opacity-70">
                        {label}
                    </span>
                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
                            trend === "up" ? "bg-white/50 text-emerald-700" : "bg-white/50 text-rose-700"
                        )}>
                            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trend === "up" ? "Good" : "Attention"}
                        </div>
                    )}
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-extrabold tracking-tight font-serif">
                        {value}
                    </span>
                    <span className="text-sm font-medium opacity-80">
                        {typeof value === 'number' ? '%' : ''}
                    </span>
                </div>

                {subtext && (
                    <p className="mt-3 text-sm font-medium opacity-80 leading-relaxed max-w-[90%]">
                        {subtext}
                    </p>
                )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <KpiCard
                label="Analysis Confidence"
                value={confidence}
                status={confidence > 80 ? "success" : confidence > 50 ? "warning" : "risk"}
                trend={confidence > 80 ? "up" : "down"}
                icon={<Zap className="w-24 h-24" />}
                subtext={confidence > 80 ? "High certainty in these results." : "Caution advised; limited data signal."}
            />

            <KpiCard
                label="Data Health"
                value={quality}
                status={quality > 85 ? "success" : quality > 60 ? "warning" : "risk"}
                trend={quality > 85 ? "up" : "down"}
                icon={<ShieldCheck className="w-24 h-24" />}
                subtext={quality > 85 ? "Dataset is clean and complete." : "Some missing fields impacting accuracy."}
            />

            <KpiCard
                label="Key Segments"
                value={clusterCount}
                status="neutral"
                icon={<Activity className="w-24 h-24 text-navy-900" />}
                subtext="Distinct patterns identified in your data."
            />
        </div>
    );
}
