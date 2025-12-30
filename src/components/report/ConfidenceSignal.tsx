
import React from 'react';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SignalProps {
    signal: {
        strength: "high" | "moderate" | "low";
        bars: 1 | 2 | 3;
        color: string;
        label: string;
        confidenceScore: number;
    };
    limitationsReason?: string | null;
}

export function ConfidenceSignal({ signal, limitationsReason }: SignalProps) {
    // Determine bar classes based on strength
    const getBarClass = (barIndex: number) => {
        // barIndex is 0, 1, 2
        // if bars (count) > barIndex, it's active
        const isActive = signal.bars > barIndex;

        // Style logic:
        // High (>0.8): 3 Solid Teal Bars
        // Moderate (0.5-0.79): 2 Solid Amber Bars
        // Low (<0.5): 1 Hollow Amber Bar (Risky) - "Hollow" implementation: border only or opacity?
        // User spec: 
        // High: 3 Solid Teal
        // Mod: 2 Solid Amber
        // Low: 1 Hollow Amber

        // Common base
        let base = "w-1.5 h-4 rounded-sm transition-all duration-300";

        if (isActive) {
            if (signal.strength === "high") return cn(base, "bg-teal-500");
            if (signal.strength === "moderate") return cn(base, "bg-amber-500");
            if (signal.strength === "low") {
                // "Hollow Amber Bar" - meaning border? or just weaker color?
                // Using border-2 border-amber-500 bg-transparent seems right for hollow
                return cn(base, "border-2 border-amber-500 bg-transparent");
            }
        }

        // Inactive bars
        return cn(base, "bg-gray-200 dark:bg-gray-700");
    };

    const tooltipText = limitationsReason
        ? `${signal.label}: ${limitationsReason}`
        : `${signal.label}: Confidence score is ${Math.round(signal.confidenceScore)}%`;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="flex items-end gap-0.5 cursor-help select-none pt-1">
                        <div className={getBarClass(0)} style={{ height: '60%' }} />
                        <div className={getBarClass(1)} style={{ height: '80%' }} />
                        <div className={getBarClass(2)} style={{ height: '100%' }} />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-sm">
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
