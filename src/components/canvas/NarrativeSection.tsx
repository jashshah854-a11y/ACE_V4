import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Claim {
    id: string;
    text: string;
    evidenceId: string;
    confidence: "high" | "moderate" | "low";
}

interface NarrativeSectionProps {
    id: string;
    type: "executive_summary" | "finding" | "method" | "recommendation";
    context?: string;
    finding: string;
    whyItMatters?: string;
    whatToDoNext?: string[];
    children?: ReactNode; // For custom content with TraceableText
    className?: string;
}

export function NarrativeSection({
    id,
    type,
    context,
    finding,
    whyItMatters,
    whatToDoNext,
    children,
    className,
}: NarrativeSectionProps) {
    return (
        <section
            id={id}
            className={cn(
                "narrative-section scroll-mt-8",
                "font-[family-name:var(--font-library-body)]",
                className
            )}
        >
            {/* Context (Background) */}
            {context && (
                <p className="context text-[hsl(var(--library-muted))] italic mb-6 text-lg leading-relaxed">
                    {context}
                </p>
            )}

            {/* Finding (Core Insight - Bolded, Prominent) */}
            <h2
                className={cn(
                    "finding font-[family-name:var(--font-library-heading)] font-bold text-[hsl(var(--library-text))] mb-6",
                    type === "executive_summary" ? "text-4xl" : "text-3xl"
                )}
            >
                {finding}
            </h2>

            {/* Custom Content (with TraceableText) */}
            {children && (
                <div className="narrative-content text-[hsl(var(--library-text))] text-lg leading-relaxed mb-8">
                    {children}
                </div>
            )}

            {/* Why it Matters (Implication) */}
            {whyItMatters && (
                <div className="why-it-matters mb-8">
                    <h3 className="font-[family-name:var(--font-library-heading)] text-xl font-semibold text-[hsl(var(--library-text))] mb-3">
                        Why it Matters
                    </h3>
                    <p className="text-[hsl(var(--library-text))] text-lg leading-relaxed">
                        {whyItMatters}
                    </p>
                </div>
            )}

            {/* What to do next (Recommendations) */}
            {whatToDoNext && whatToDoNext.length > 0 && (
                <div className="recommendations mb-8">
                    <h3 className="font-[family-name:var(--font-library-heading)] text-xl font-semibold text-[hsl(var(--library-text))] mb-3">
                        What to do next
                    </h3>
                    <ul className="space-y-2">
                        {whatToDoNext.map((item, index) => (
                            <li
                                key={index}
                                className="flex items-start gap-3 text-[hsl(var(--library-text))] text-lg leading-relaxed"
                            >
                                <span className="text-[hsl(var(--lab-signal))] font-bold mt-1">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
