import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Info, TrendingUp, AlertOctagon } from "lucide-react";
import type { TrustScore } from "@/types/trust";
import { TrustBadge } from "@/components/trust/TrustBadge";
import { TrustBreakdown } from "@/components/trust/TrustBreakdown";
import { useNarrative } from "@/components/narrative/NarrativeContext";

type Sentiment = "positive" | "negative" | "neutral" | "caution";

interface SentimentBlockProps {
    sentiment: Sentiment;
    title: string;
    children: ReactNode;
    impact?: string; // "Why this matters" text
    trust?: TrustScore;
    insightId?: string;
}

export function SentimentBlock({ sentiment, title, children, impact, trust, insightId }: SentimentBlockProps) {
    const styles = {
        positive: {
            border: "border-teal-200 dark:border-teal-900",
            bg: "bg-teal-50/50 dark:bg-teal-900/10",
            icon: TrendingUp,
            iconColor: "text-teal-600 dark:text-teal-400",
            bar: "bg-teal-500"
        },
        negative: {
            border: "border-rose-200 dark:border-rose-900",
            bg: "bg-rose-50/50 dark:bg-rose-900/10",
            icon: AlertOctagon,
            iconColor: "text-rose-600 dark:text-rose-400",
            bar: "bg-rose-500"
        },
        caution: {
            border: "border-amber-200 dark:border-amber-900",
            bg: "bg-amber-50/50 dark:bg-amber-900/10",
            icon: AlertTriangle,
            iconColor: "text-amber-600 dark:text-amber-400",
            bar: "bg-amber-500"
        },
        neutral: {
            border: "border-transparent",
            bg: "bg-transparent",
            icon: Info,
            iconColor: "text-slate-400",
            bar: "bg-slate-300 dark:bg-slate-700"
        }
    };

    const currentStyle = styles[sentiment] || styles.neutral;
    const Icon = currentStyle.icon;
    const { mode } = useNarrative();

    return (
        <div className={cn(
            "relative rounded-2xl p-6 md:p-8 mb-8 overflow-hidden transition-all duration-300",
            currentStyle.border,
            "border", // Ensure border width is applied
            sentiment === 'neutral' ? "" : currentStyle.bg
        )}>
            {/* Decorative Side Bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", currentStyle.bar)} />

            <div className="flex items-start gap-4">
                {/* Icon (only for non-neutral to reduce noise, or always if desired) */}
                {sentiment !== 'neutral' && (
                    <div className={cn("mt-1 p-2 rounded-full bg-white/50 dark:bg-black/20 shrink-0", currentStyle.iconColor)}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}

                <div className="flex-1">
                    {/* Title */}
                    <h3 className={cn(
                        "text-2xl font-serif font-bold mb-2",
                        "text-foreground"
                    )}>
                        {title}
                    </h3>

                    {trust && (
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <TrustBadge trust={trust} showScore={true} />
                            {/* Removed "Certified insight" text to reduce badge spam */}
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="prose-report text-lg leading-relaxed font-serif text-slate-700 dark:text-slate-300">
                        {children}
                    </div>

                    {trust && (
                        <div className="mt-4">
                            <TrustBreakdown trust={trust} mode={mode} insightId={insightId} />
                        </div>
                    )}

                    {/* "Why This Matters" Footer */}
                    {impact && (
                        <div className="mt-6 pt-6 border-t border-border/10 flex items-start gap-3">
                            <div className="bg-primary/10 p-1.5 rounded-full mt-0.5">
                                <Info className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">Why this matters</span>
                                <p className="text-sm text-muted-foreground italic font-sans">{impact}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
