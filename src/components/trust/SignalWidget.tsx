
import React from "react";
import { ShieldCheck, TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignalWidgetProps {
    score: number; // 0.0 to 1.0
    reasoning?: string;
    className?: string;
    compact?: boolean;
}

export function SignalWidget({ score, reasoning, className, compact = false }: SignalWidgetProps) {
    // Determine state based on score
    // Verified: > 0.85
    // Trend: 0.50 - 0.85
    // Tentative: < 0.50

    let state: "verified" | "trend" | "tentative" = "tentative";
    if (score > 0.85) state = "verified";
    else if (score >= 0.50) state = "trend";

    const config = {
        verified: {
            label: "Verified",
            icon: ShieldCheck,
            color: "text-teal-600",
            bg: "bg-teal-100",
            border: "border-teal-200",
            solid: "bg-teal-500 text-white border-transparent",
            description: "High confidence. Supported by robust statistical evidence."
        },
        trend: {
            label: "Trend",
            icon: TrendingUp,
            color: "text-teal-600",
            bg: "bg-teal-50",
            border: "border-teal-200", // Hollow Teal
            solid: "bg-teal-100 text-teal-700 border-teal-200",
            description: "Directionally correct, but may have noise or limited sample."
        },
        tentative: {
            label: "Tentative",
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-200", // Hollow Amber
            solid: "bg-amber-100 text-amber-700 border-amber-200",
            description: "Low confidence. High variance or insufficient data."
        }
    };

    const activeConfig = config[state];
    const Icon = activeConfig.icon;
    const displayReason = reasoning || activeConfig.description;

    // Visual style: 
    // Verified -> Solid Teal
    // Trend -> Hollow Teal (or light solid)
    // Tentative -> Hollow Amber

    const baseClasses = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    const styleClasses = state === "verified"
        ? activeConfig.solid
        : cn("bg-transparent", activeConfig.color, activeConfig.border);

    // For medium/trend, user requested "Hollow". 
    // Let's ensure tentative is also hollow/amber.

    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <div className={cn(baseClasses, styleClasses, className, "cursor-help")}>
                        <Icon className={cn("h-3.5 w-3.5", state === "verified" ? "text-white" : activeConfig.color)} />
                        {!compact && <span>{activeConfig.label}</span>}
                        {/* Score pill for technical users, hidden by default or small */}
                        {score > 0 && (
                            <span className={cn("ml-1 text-[10px] opacity-80", state === "verified" ? "text-white/90" : "")}>
                                {Math.round(score * 100)}%
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs space-y-2 p-3">
                    <div className="flex items-center gap-2 font-semibold">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{state} Insight</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{displayReason}</p>
                    <div className="text-[10px] text-muted-foreground mt-1 pt-1 border-t">
                        Ai Analyst Confidence: {Math.round(score * 100)}%
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
