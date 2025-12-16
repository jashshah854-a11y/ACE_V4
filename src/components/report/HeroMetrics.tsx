import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedMetricProps {
    value: number;
    label: string;
    suffix?: string;
    trend?: "up" | "down" | "neutral";
    color?: "blue" | "green" | "yellow" | "red";
    icon?: React.ReactNode;
}

export function AnimatedMetric({
    value,
    label,
    suffix = "",
    trend,
    color = "blue",
    icon,
}: AnimatedMetricProps) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(current);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    const colorClasses = {
        blue: "from-blue-500 to-cyan-500 border-blue-500/20",
        green: "from-emerald-500 to-green-500 border-emerald-500/20",
        yellow: "from-amber-500 to-yellow-500 border-amber-500/20",
        red: "from-rose-500 to-pink-500 border-red-500/20",
    };

    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className={cn(
                "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-6",
                "hover:shadow-2xl transition-all duration-300 hover:-translate-y-1",
                colorClasses[color]
            )}
        >
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

            <div className="relative z-10">
                {/* Icon */}
                {icon && (
                    <div className="mb-3 text-white/80">
                        {icon}
                    </div>
                )}

                {/* Value with animation */}
                <motion.div
                    className="text-4xl font-bold text-white mb-2"
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                >
                    {formatNumber(displayValue)}
                    {suffix && <span className="text-2xl ml-1">{suffix}</span>}
                </motion.div>

                {/* Label */}
                <div className="text-white/90 text-sm font-medium mb-2">
                    {label}
                </div>

                {/* Trend indicator */}
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs",
                        trend === "up" && "text-white",
                        trend === "down" && "text-white/70",
                        trend === "neutral" && "text-white/50"
                    )}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{trend === "up" ? "Trending up" : trend === "down" ? "Trending down" : "Stable"}</span>
                    </div>
                )}
            </div>

            {/* Glow effect */}
            <div className="absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        </motion.div>
    );
}

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    if (num % 1 !== 0) {
        return num.toFixed(1);
    }
    return Math.floor(num).toString();
}

interface HeroMetricsProps {
    metrics: {
        value: number;
        label: string;
        suffix?: string;
        trend?: "up" | "down" | "neutral";
        color?: "blue" | "green" | "yellow" | "red";
        icon?: React.ReactNode;
    }[];
    className?: string;
}

export function HeroMetrics({ metrics, className }: HeroMetricsProps) {
    return (
        <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
            {metrics.map((metric, index) => (
                <AnimatedMetric key={index} {...metric} />
            ))}
        </div>
    );
}
