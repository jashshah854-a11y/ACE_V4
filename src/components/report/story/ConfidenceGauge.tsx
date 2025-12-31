import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
    value: number; // 0 to 100
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function ConfidenceGauge({ value, className, size = "md" }: ConfidenceGaugeProps) {
    // Clamp value
    const score = Math.min(100, Math.max(0, value));

    // Config based on size
    const config = {
        sm: { width: 60, stroke: 4, label: "text-[10px]" },
        md: { width: 100, stroke: 8, label: "text-lg" },
        lg: { width: 160, stroke: 12, label: "text-2xl" },
    }[size];

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((score / 100) * circumference) / 2; // Only half circle

    // Color logic
    const getColor = (s: number) => {
        if (s >= 80) return "text-emerald-500 stroke-emerald-500";
        if (s >= 50) return "text-amber-500 stroke-amber-500";
        return "text-rose-500 stroke-rose-500";
    };

    const colorClass = getColor(score);

    return (
        <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: config.width }}>
            <svg
                viewBox="0 0 100 60"
                className="w-full h-full overflow-visible"
            >
                {/* Background Track */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    className="stroke-muted/30"
                    strokeWidth={config.stroke}
                    strokeLinecap="round"
                />

                {/* Value Arc */}
                <motion.path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    className={cn("transition-colors duration-500", colorClass)}
                    strokeWidth={config.stroke}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: score / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />
            </svg>

            <div className={cn("absolute bottom-0 font-bold font-mono tracking-tighter", config.label, colorClass)}>
                {score}%
            </div>
        </div>
    );
}
