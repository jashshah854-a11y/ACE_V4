import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
    value: number; // 0-100
    size?: number;
    strokeWidth?: number;
    label?: string;
    color?: "blue" | "green" | "yellow" | "red";
    showValue?: boolean;
}

export function CircularProgress({
    value,
    size = 120,
    strokeWidth = 8,
    label,
    color = "blue",
    showValue = true,
}: CircularProgressProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setProgress(value), 100);
        return () => clearTimeout(timer);
    }, [value]);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    const colorMap = {
        blue: { stroke: "#3B82F6", glow: "#3B82F6" },
        green: "#10B981",
        yellow: "#F59E0B",
        red: "#EF4444",
    };

    const strokeColor =
        value >= 90 ? colorMap.green :
            value >= 70 ? colorMap.yellow :
                colorMap.red;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    className="transform -rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="none"
                        className="text-muted opacity-20"
                    />

                    {/* Progress circle */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        stroke={strokeColor}
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{
                            strokeDasharray: circumference,
                            filter: `drop-shadow(0 0 6px ${strokeColor}40)`,
                        }}
                    />
                </svg>

                {/* Center value */}
                {showValue && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            className="text-2xl font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {Math.round(progress)}%
                        </motion.span>
                    </div>
                )}
            </div>

            {label && (
                <span className="text-sm font-medium text-muted-foreground">
                    {label}
                </span>
            )}
        </div>
    );
}

interface ProgressRingGroupProps {
    items: Array<{
        value: number;
        label: string;
        color?: "blue" | "green" | "yellow" | "red";
    }>;
    className?: string;
}

export function ProgressRingGroup({ items, className }: ProgressRingGroupProps) {
    return (
        <div className={cn("flex flex-wrap gap-8 justify-center", className)}>
            {items.map((item, index) => (
                <CircularProgress
                    key={index}
                    value={item.value}
                    label={item.label}
                    color={item.color}
                />
            ))}
        </div>
    );
}
