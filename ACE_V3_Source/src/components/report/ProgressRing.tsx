import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
    value: number; // 0-100
    size?: number; // diameter in pixels
    strokeWidth?: number;
    color?: string;
    showValue?: boolean;
    label?: string;
    className?: string;
}

/**
 * Circular progress ring for quality indicators
 * Visual shortcut for metrics like data quality, model fit, etc.
 */
export function ProgressRing({
    value,
    size = 120,
    strokeWidth = 8,
    color,
    showValue = true,
    label,
    className
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(100, Math.max(0, value));
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Auto color based on value if not specified
    const ringColor = color || (
        progress >= 90 ? "stroke-green-500" :
            progress >= 70 ? "stroke-yellow-500" :
                progress >= 50 ? "stroke-orange-500" :
                    "stroke-red-500"
    );

    return (
        <div className={cn("flex flex-col items-center", className)}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted opacity-20"
                />

                {/* Progress Circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    strokeLinecap="round"
                    className={ringColor}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />

                {/* Center Value */}
                {showValue && (
                    <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-2xl font-bold fill-current transform rotate-90"
                        style={{ transformOrigin: 'center' }}
                    >
                        {Math.round(progress)}%
                    </text>
                )}
            </svg>

            {/* Label */}
            {label && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                    {label}
                </p>
            )}
        </div>
    );
}
