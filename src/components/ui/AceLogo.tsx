import { Action, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AceLogoProps {
    className?: string;
    mode?: "icon" | "full";
    size?: "sm" | "md" | "lg" | "xl";
}

export function AceLogo({ className, mode = "full", size = "md" }: AceLogoProps) {
    const sizeClasses = {
        sm: "h-6",
        md: "h-8",
        lg: "h-12",
        xl: "h-16"
    };

    const textSizes = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-3xl",
        xl: "text-4xl"
    };

    return (
        <div className={cn("flex items-center gap-3 font-sans", className)}>
            <div className={cn("relative aspect-square flex items-center justify-center", sizeClasses[size])}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-teal-500 overflow-visible">
                    <defs>
                        <linearGradient id="ace-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="1" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Central Core */}
                    <motion.path
                        d="M50 20 L80 35 L80 65 L50 80 L20 65 L20 35 Z"
                        fill="none"
                        stroke="url(#ace-gradient)"
                        strokeWidth="8"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        filter="url(#glow)"
                    />

                    {/* Inner Structure */}
                    <motion.path
                        d="M50 20 L50 50 L80 65 M50 50 L20 65"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeOpacity="0.5"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                    />

                    {/* Orbital Ring - Dynamic */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeOpacity="0.3"
                        fill="none"
                        strokeDasharray="10 10"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                </svg>
            </div>

            {mode === "full" && (
                <div className="flex flex-col justify-center">
                    <h1 className={cn("font-bold tracking-tight leading-none text-slate-900 dark:text-slate-100", textSizes[size])}>
                        ACE
                    </h1>
                    {size !== 'sm' && (
                        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium">
                            Autonomous Cognitive Engine
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
