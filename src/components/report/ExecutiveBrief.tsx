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

interface BriefData {
    purpose: string;
    keyFindings: string[];
    confidenceVerdict: string;
    recommendedAction: string;
}

interface ExecutiveBriefProps {
    brief: BriefData;
    isLoading?: boolean;
    // Optional overrides
    status?: "success" | "limited" | "error";
    accentColor?: "teal" | "amber" | "red";
    onCopy?: () => void;
    onFindingClick?: () => void;
    onDecisionClick?: () => void;
    // Enhanced analytics for Zero-Touch detection
    enhancedAnalytics?: any;
    onEvidenceClick?: (type: 'business_pulse' | 'predictive_drivers') => void;
}

export function ExecutiveBrief({
    brief,
    isLoading = false,
    status = "success",
    accentColor = "teal",
    onCopy,
    onFindingClick,
    onDecisionClick,
    enhancedAnalytics,
    onEvidenceClick,
}: ExecutiveBriefProps) {
    const headline = brief.purpose || "Executive Summary";
    const keyFinding = brief.keyFindings?.[0] || "Analysis complete.";
    const decision = brief.recommendedAction || "Review detailed metrics below.";

    // safe signal mock
    const qualityScore = 0.85; // Placeholder - should come from analytics
    const isLowQuality = qualityScore < 0.7; // Define low quality threshold
    const confidenceSignal = {
        strength: "high" as const,
        bars: 3 as const,
        color: "teal",
        label: "AI Confidence",
        confidenceScore: 95
    };

    // Determine accent color classes
    const accentClasses = {
        teal: "border-teal-500",
        amber: "border-amber-500",
        red: "border-red-500"
    };

    const accentBorderClass = accentClasses[accentColor];

    // Zero-Touch Intelligence: Detect churn risk signal
    const churnSignal = enhancedAnalytics?.business_intelligence?.churn_risk;

    // Debug logging
    console.log('[ExecutiveBrief] enhancedAnalytics:', enhancedAnalytics);
    console.log('[ExecutiveBrief] churnSignal:', churnSignal);

    const hasChurnRisk = churnSignal && churnSignal.at_risk_percentage > 20;

    return (
        <Card
            className={cn(
                "bg-gray-50 dark:bg-gray-900/50",
                "border-l-4 shadow-md mb-6",
                accentBorderClass
            )}
        >
            <div className="p-6 space-y-4">
                {/* Zero-Touch Intelligence: Churn Risk Headline */}
                {hasChurnRisk && onEvidenceClick && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r-lg mb-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-serif text-gray-900 dark:text-gray-100 leading-relaxed">
                                    ACE detected a high-risk segment comprising{' '}
                                    <button
                                        onClick={() => onEvidenceClick('business_pulse')}
                                        className="font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline decoration-2 underline-offset-2 transition-colors"
                                    >
                                        {churnSignal.at_risk_percentage.toFixed(1)}%
                                    </button>{' '}
                                    of the user base.
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Click percentage to view detailed metrics →
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Headline Row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                {headline}
                            </h2>
                            {/* Quality Gate Badge */}
                            {isLowQuality && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs font-mono font-medium text-amber-500">
                                        Low Confidence ({Math.round(qualityScore * 100)}%)
                                    </span>
                                </div>
                            )}
                            {status === "limited" && (
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-1" />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
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
