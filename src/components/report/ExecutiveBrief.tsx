/**
 * ExecutiveBrief Component
 * 
 * High-density TL;DR card that answers "What? So What? Now What?" at the top of reports.
 * Provides instant value with headline, key finding, and actionable decision.
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Zap, Copy, AlertTriangle } from "lucide-react";
import { ConfidenceSignal } from "./ConfidenceSignal";
import { cn } from "@/lib/utils";

interface ExecutiveBriefProps {
    headline: string;
    keyFinding: string;
    decision: string;
    status: "success" | "limited" | "error";
    accentColor: "teal" | "amber" | "red";
    confidenceSignal: {
        strength: "high" | "moderate" | "low";
        bars: 1 | 2 | 3;
        color: string;
        label: string;
        confidenceScore: number;
    };
    onCopy?: () => void;
    onFindingClick?: () => void;
    onDecisionClick?: () => void;
}

export function ExecutiveBrief({
    headline,
    keyFinding,
    decision,
    status,
    accentColor,
    confidenceSignal,
    onCopy,
    onFindingClick,
    onDecisionClick,
}: ExecutiveBriefProps) {

    // Determine accent color classes
    const accentClasses = {
        teal: "border-teal-500",
        amber: "border-amber-500",
        red: "border-red-500"
    };

    const accentBorderClass = accentClasses[accentColor];

    return (
        <Card
            className={cn(
                "sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/50",
                "border-l-4 shadow-md mb-6",
                accentBorderClass
            )}
        >
            <div className="p-6 space-y-4">
                {/* Headline Row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
                                {headline}
                            </h2>
                            {status === "limited" && (
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <ConfidenceSignal
                            signal={confidenceSignal}
                            limitationsReason={null}
                        />
                        {onCopy && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCopy}
                                className="h-8 w-8 p-0"
                                title="Copy brief to clipboard"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Finding & Decision Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Finding Card */}
                    <button
                        onClick={onFindingClick}
                        className={cn(
                            "text-left p-4 rounded-lg border-2 transition-all",
                            "bg-white dark:bg-gray-800",
                            "hover:border-primary hover:shadow-md",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Search className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                    Key Finding
                                </div>
                                <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                                    {keyFinding}
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Decision Card */}
                    <button
                        onClick={onDecisionClick}
                        className={cn(
                            "text-left p-4 rounded-lg border-2 transition-all",
                            "bg-white dark:bg-gray-800",
                            "hover:border-primary hover:shadow-md",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                    Recommended Action
                                </div>
                                <p className="text-sm leading-relaxed font-medium text-gray-900 dark:text-gray-100">
                                    {decision}
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </Card>
    );
}
