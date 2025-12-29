import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ConfidenceIndicator, ConfidenceLevel } from "@/components/library/ConfidenceIndicator";

interface Insight {
    id: string;
    title: string;
    confidence: ConfidenceLevel;
    category?: string;
}

interface EvidenceItem {
    id: string;
    type: "chart" | "table" | "calculation";
    content: ReactNode;
    citation?: string;
}

interface InsightCanvasProps {
    insights: Insight[];
    narrativeContent: ReactNode;
    evidenceMap: Record<string, EvidenceItem>;
    className?: string;
}

export function InsightCanvas({
    insights,
    narrativeContent,
    evidenceMap,
    className,
}: InsightCanvasProps) {
    const [activeInsight, setActiveInsight] = useState<string | null>(
        insights.length > 0 ? insights[0].id : null
    );
    const [activeEvidence, setActiveEvidence] = useState<string | null>(null);

    const currentEvidence = activeEvidence ? evidenceMap[activeEvidence] : null;

    return (
        <div className={cn("w-full h-screen flex", className)}>
            {/* Left Panel - Key Insights Navigation */}
            <aside className="w-64 border-r border-[hsl(var(--library-muted))]/20 bg-[hsl(var(--library-bg))] overflow-y-auto">
                <div className="p-6 border-b border-[hsl(var(--library-muted))]/20">
                    <h2 className="font-[family-name:var(--font-library-heading)] text-xl text-[hsl(var(--library-text))]">
                        Key Insights
                    </h2>
                </div>
                <nav className="p-4">
                    <ul className="space-y-2">
                        {insights.map((insight) => (
                            <li key={insight.id}>
                                <button
                                    onClick={() => setActiveInsight(insight.id)}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg transition-colors",
                                        "font-[family-name:var(--font-library-body)] text-sm",
                                        activeInsight === insight.id
                                            ? "bg-[hsl(var(--library-accent))]/10 text-[hsl(var(--library-text))]"
                                            : "text-[hsl(var(--library-muted))] hover:bg-[hsl(var(--library-accent))]/5"
                                    )}
                                >
                                    <div className="flex items-start gap-2">
                                        <ConfidenceIndicator level={insight.confidence} className="mt-0.5" />
                                        <span className="flex-1">{insight.title}</span>
                                    </div>
                                    {insight.category && (
                                        <div className="text-xs text-[hsl(var(--library-muted))]/60 mt-1 ml-6">
                                            {insight.category}
                                        </div>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            {/* Center Panel - The Story (Narrative) */}
            <main className="flex-1 overflow-y-auto bg-[hsl(var(--library-bg))]">
                <div className="max-w-3xl mx-auto px-12 py-16">
                    <div className="prose prose-lg max-w-none">
                        {/* Library aesthetic for narrative */}
                        <div className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-text))] leading-relaxed">
                            {narrativeContent}
                        </div>
                    </div>
                </div>
            </main>

            {/* Right Panel - Evidence Rail */}
            <aside className="w-96 border-l border-[hsl(var(--lab-border))] bg-[hsl(var(--lab-charcoal))] overflow-y-auto">
                <div className="p-6 border-b border-[hsl(var(--lab-border))]">
                    <h3 className="font-[family-name:var(--font-lab)] text-sm uppercase tracking-wider text-[hsl(var(--lab-signal))]">
                        Evidence
                    </h3>
                </div>

                <div className="p-6">
                    {currentEvidence ? (
                        <div className="space-y-4">
                            <div className="text-[hsl(var(--lab-silver))] font-[family-name:var(--font-lab)] text-sm">
                                {currentEvidence.content}
                            </div>
                            {currentEvidence.citation && (
                                <div className="pt-4 border-t border-[hsl(var(--lab-border))]">
                                    <p className="text-[hsl(var(--lab-silver))]/60 font-[family-name:var(--font-lab)] text-xs">
                                        {currentEvidence.citation}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-[hsl(var(--lab-silver))]/40 font-[family-name:var(--font-lab)] text-sm">
                                Click on a claim in the narrative to see supporting evidence
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

// Helper component for clickable claims in narrative
interface ClaimLinkProps {
    evidenceId: string;
    children: ReactNode;
    onActivate: (evidenceId: string) => void;
}

export function ClaimLink({ evidenceId, children, onActivate }: ClaimLinkProps) {
    return (
        <span
            onClick={() => onActivate(evidenceId)}
            className={cn(
                "cursor-pointer underline decoration-[hsl(var(--library-accent))]/40 decoration-2",
                "hover:decoration-[hsl(var(--library-accent))] hover:bg-[hsl(var(--library-accent))]/5",
                "transition-all rounded px-1"
            )}
        >
            {children}
        </span>
    );
}
