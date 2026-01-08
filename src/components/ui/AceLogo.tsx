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
                <svg viewBox="0 0 100 100" className="w-full h-full text-teal-600 dark:text-teal-400 overflow-visible">
                    <defs>
                        <linearGradient id="ace-gradient-logo" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#0F766E" />
                            <stop offset="100%" stopColor="#2DD4BF" />
                        </linearGradient>
                        <filter id="glow-logo">
                            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* The Quill / Feather Shape - representing Story */}
                    <motion.path
                        d="M30 85 C30 85 45 70 55 50 C65 30 80 10 90 5 C90 5 80 20 75 40 C70 60 55 80 50 90 Z"
                        fill="url(#ace-gradient-logo)"
                        stroke="none"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    {/* The Quill Spine */}
                    <motion.path
                        d="M30 85 Q 55 50 90 5"
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                    />

                    {/* Data Nodes / Circuit Lines flowing INTO the Quill */}
                    {/* Line 1 */}
                    <motion.path
                        d="M10 30 L 30 30 L 45 45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                    />
                    <motion.circle cx="10" cy="30" r="3" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />

                    {/* Line 2 */}
                    <motion.path
                        d="M15 50 L 35 50 L 42 57"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.0, duration: 0.8 }}
                    />
                    <motion.circle cx="15" cy="50" r="3" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 }} />

                    {/* Line 3 (Bottom) */}
                    <motion.path
                        d="M20 70 L 35 70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                    />
                    <motion.circle cx="20" cy="70" r="3" fill="currentColor" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 }} />


                    {/* Sparkles / Magic */}
                    <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8, duration: 0.5 }}
                    >
                        <circle cx="85" cy="15" r="1.5" fill="#facc15" className="animate-pulse" />
                        <circle cx="75" cy="25" r="1" fill="#facc15" className="animate-pulse-slow" />
                    </motion.g>

                </svg>
            </div>

            {mode === "full" && (
                <div className="flex flex-col justify-center">
                    <h1 className={cn("font-bold tracking-tight leading-none text-slate-900 dark:text-slate-100", textSizes[size])}>
                        ACE
                    </h1>
                    {size !== 'sm' && (
                        <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase font-medium">
                            Advanced Contextual Engine
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
