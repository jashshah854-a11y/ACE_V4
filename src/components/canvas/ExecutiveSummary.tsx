import { cn } from "@/lib/utils";
import { ConfidenceIndicator, ConfidenceLevel } from "@/components/library/ConfidenceIndicator";
import { AlertCircle } from "lucide-react";

interface ExecutiveSummaryProps {
    decision: string;
    decisionConfidence?: ConfidenceLevel;
    tradeoffs?: string[];
    actionItems: string[];
    context?: string;
    warnings?: string[];
    className?: string;
}

export function ExecutiveSummary({
    decision,
    decisionConfidence = "high",
    tradeoffs = [],
    actionItems,
    context,
    warnings = [],
    className,
}: ExecutiveSummaryProps) {
    return (
        <div
            id="executive-summary"
            className={cn(
                "executive-summary max-w-4xl mx-auto px-12 py-16 scroll-mt-8",
                className
            )}
        >
            {/* Context (if provided) */}
            {context && (
                <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] italic text-lg leading-relaxed mb-8">
                    {context}
                </p>
            )}

            {/* The Decision - Large Headline */}
            <div className="mb-12">
                <div className="flex items-start gap-4 mb-4">
                    <h1 className="font-[family-name:var(--font-library-heading)] text-5xl font-bold text-[hsl(var(--library-text))] leading-tight flex-1">
                        {decision}
                    </h1>
                    <ConfidenceIndicator level={decisionConfidence} showLabel />
                </div>
            </div>

            {/* Warnings (if any) */}
            {warnings.length > 0 && (
                <div className="mb-12 space-y-3">
                    {warnings.map((warning, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-3 p-4 bg-[hsl(var(--lab-alert))]/10 border border-[hsl(var(--lab-alert))]/30 rounded-lg"
                        >
                            <AlertCircle className="w-5 h-5 text-[hsl(var(--lab-alert))] flex-shrink-0 mt-0.5" />
                            <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-text))] text-base leading-relaxed">
                                {warning}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* The Trade-offs */}
            {tradeoffs.length > 0 && (
                <section className="mb-12 pb-12 border-b border-[hsl(var(--library-muted))]/20">
                    <h2 className="font-[family-name:var(--font-library-heading)] text-2xl font-semibold text-[hsl(var(--library-text))] mb-6">
                        Trade-offs
                    </h2>
                    <ul className="space-y-4">
                        {tradeoffs.map((tradeoff, idx) => (
                            <li
                                key={idx}
                                className="flex items-start gap-3 font-[family-name:var(--font-library-body)] text-[hsl(var(--library-text))] text-lg leading-relaxed"
                            >
                                <span className="text-[hsl(var(--lab-alert))] font-bold mt-1">⚠</span>
                                <span>{tradeoff}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Action Items - What to do next */}
            <section className="mb-12">
                <h2 className="font-[family-name:var(--font-library-heading)] text-2xl font-semibold text-[hsl(var(--library-text))] mb-6">
                    What to do next
                </h2>
                <ul className="space-y-4">
                    {actionItems.map((action, idx) => (
                        <li
                            key={idx}
                            className="flex items-start gap-3 font-[family-name:var(--font-library-body)] text-[hsl(var(--library-text))] text-lg leading-relaxed"
                        >
                            <span className="text-[hsl(var(--lab-signal))] font-bold mt-1">{idx + 1}.</span>
                            <span>{action}</span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Divider before detailed findings */}
            <div className="pt-12 border-t-2 border-[hsl(var(--library-muted))]/20">
                <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] text-center text-sm uppercase tracking-wider">
                    Detailed Findings Below
                </p>
            </div>
        </div>
    );
}
