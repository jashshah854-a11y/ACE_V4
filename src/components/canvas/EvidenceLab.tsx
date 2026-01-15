import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Code, Database, GitBranch, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EvidenceObject } from '@/lib/reportParser';

interface EvidenceLabProps {
    /** Array of evidence objects from extractEvidenceObjects() */
    evidence: EvidenceObject[];

    /** Currently active evidence ID (from click-to-verify) */
    activeEvidenceId?: string | null;

    /** Callback when evidence card is clicked */
    onEvidenceClick?: (evidenceId: string) => void;

    /** Whether to show reasoning stream animation */
    showReasoningStream?: boolean;
}

/**
 * The Evidence Lab — Right Panel (30%)
 * 
 * Terminal-style "Raw Truth" engine displaying mathematical and code-level
 * proof for every claim in the narrative.
 * 
 * Features:
 * - Monospace typography (JetBrains Mono)
 * - Terminal aesthetics (green text on dark background)
 * - Code snippet rendering with syntax highlighting
 * - Data lineage visualization
 * - Click-to-verify smooth scroll and pulse
 * - Subtractive design charts
 */
export function EvidenceLab({
    evidence,
    activeEvidenceId,
    onEvidenceClick,
    showReasoningStream = false
}: EvidenceLabProps) {
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // Auto-scroll to active evidence when it changes
    useEffect(() => {
        if (activeEvidenceId) {
            const cardElement = cardRefs.current.get(activeEvidenceId);
            if (cardElement) {
                cardElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }, [activeEvidenceId]);

    const toggleCard = (evidenceId: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(evidenceId)) {
                next.delete(evidenceId);
            } else {
                next.add(evidenceId);
            }
            return next;
        });
    };

    return (
        <div className="h-full flex flex-col bg-lab-bg text-lab-text font-data">
            {/* Lab Header */}
            <header className="p-6 border-b border-lab-accent/20">
                <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-lab-accent" />
                    <h2 className="text-sm font-semibold text-lab-accent uppercase tracking-wider">
                        Evidence Lab
                    </h2>
                </div>
                <p className="text-xs text-lab-text/60">
                    Mathematical proof & code lineage
                </p>
            </header>

            {/* Reasoning Stream Animation */}
            {showReasoningStream && <ReasoningStream />}

            {/* Evidence Cards */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {evidence.length === 0 ? (
                    <div className="text-center py-12 text-lab-text/40">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No evidence objects available</p>
                        <p className="text-xs mt-2">
                            Evidence will appear here when you click claims in the narrative
                        </p>
                    </div>
                ) : (
                    evidence.map((item) => (
                        <EvidenceCard
                            key={item.id}
                            evidence={item}
                            isActive={activeEvidenceId === item.id}
                            isExpanded={expandedCards.has(item.id)}
                            onToggle={() => toggleCard(item.id)}
                            onClick={() => onEvidenceClick?.(item.id)}
                            ref={(el) => {
                                if (el) cardRefs.current.set(item.id, el);
                            }}
                        />
                    ))
                )}
            </div>

            {/* Lab Footer */}
            <footer className="p-4 border-t border-lab-accent/20">
                <p className="text-xs text-lab-text/40 text-center">
                    {evidence.length} evidence object{evidence.length !== 1 ? 's' : ''} verified
                </p>
            </footer>
        </div>
    );
}

/**
 * Evidence Card Component
 * Displays individual proof points with code snippets and lineage
 */
interface EvidenceCardProps {
    evidence: EvidenceObject;
    isActive: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onClick: () => void;
}

const EvidenceCard = React.forwardRef<HTMLDivElement, EvidenceCardProps>(
    ({ evidence, isActive, isExpanded, onToggle, onClick }, ref) => {
        // Type badge colors
        const typeColors = {
            business_pulse: 'text-green-400 bg-green-400/10 border-green-400/30',
            predictive_drivers: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
            correlation: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
            distribution: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
            quality: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
        };

        const typeColor = typeColors[evidence.type] || typeColors.quality;

        // Operator glyphs for parametric feel
        const typeGlyphs = {
            business_pulse: '∑',
            predictive_drivers: '∫',
            correlation: '≈',
            distribution: 'Δ',
            quality: '√',
        };

        const glyph = typeGlyphs[evidence.type] || '•';

        return (
            <div
                ref={ref}
                onClick={onClick}
                className={cn(
                    "border rounded-lg transition-all duration-300 cursor-pointer",
                    isActive
                        ? "border-lab-accent bg-lab-accent/10 evidence-highlighted"
                        : "border-lab-text/20 hover:border-lab-text/40 bg-lab-bg"
                )}
            >
                {/* Card Header */}
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                            {/* Type Badge */}
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border mb-2",
                                typeColor
                            )}>
                                <span className="text-base">{glyph}</span>
                                {evidence.type.replace(/_/g, ' ').toUpperCase()}
                            </span>

                            {/* Claim */}
                            <h3 className="text-sm font-semibold text-lab-accent leading-tight">
                                {evidence.claim}
                            </h3>
                        </div>

                        {/* Expand/Collapse Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            className="flex-shrink-0 p-1 hover:bg-lab-text/10 rounded transition-colors"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-lab-accent" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-lab-text/60" />
                            )}
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-xs text-lab-text/60">
                        <span className="flex items-center gap-1">
                            <Database className="w-3 h-3" />
                            {evidence.lineage.sourceTable}
                        </span>
                        <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {evidence.lineage.transformations.length} step{evidence.lineage.transformations.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-lab-text/10 p-4 space-y-4 animate-in slide-in-from-top duration-200">
                        {/* Code Snippet */}
                        {(evidence.proof.python || evidence.proof.sql) && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Code className="w-3 h-3 text-lab-accent" />
                                    <h4 className="text-xs font-semibold text-lab-accent uppercase tracking-wide">
                                        Source Code
                                    </h4>
                                </div>
                                <pre className="bg-black/40 border border-lab-text/20 rounded p-3 overflow-x-auto text-xs leading-relaxed">
                                    <code className="text-green-300">
                                        {evidence.proof.python || evidence.proof.sql}
                                    </code>
                                </pre>
                            </div>
                        )}

                        {/* Data Lineage */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <GitBranch className="w-3 h-3 text-lab-accent" />
                                <h4 className="text-xs font-semibold text-lab-accent uppercase tracking-wide">
                                    Data Lineage
                                </h4>
                            </div>
                            <div className="space-y-2">
                                {/* Source Table */}
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-lab-accent" />
                                    <span className="text-lab-text/80">
                                        Source: <span className="text-lab-accent">{evidence.lineage.sourceTable}</span>
                                    </span>
                                </div>

                                {/* Transformations */}
                                {evidence.lineage.transformations.map((transform, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs ml-4">
                                        <div className="w-1 h-1 rounded-full bg-lab-text/40" />
                                        <span className="text-lab-text/60">{transform}</span>
                                    </div>
                                ))}

                                {/* Result */}
                                <div className="flex items-center gap-2 text-xs">
                                    <CheckCircle className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400">Result: {evidence.claim}</span>
                                </div>
                            </div>
                        </div>

                        {/* Raw Data Preview */}
                        {evidence.proof.rawData && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-3 h-3 text-lab-accent" />
                                    <h4 className="text-xs font-semibold text-lab-accent uppercase tracking-wide">
                                        Raw Data
                                    </h4>
                                </div>
                                <pre className="bg-black/40 border border-lab-text/20 rounded p-3 overflow-x-auto text-xs leading-relaxed max-h-48">
                                    <code className="text-cyan-300">
                                        {JSON.stringify(evidence.proof.rawData, null, 2)}
                                    </code>
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

EvidenceCard.displayName = 'EvidenceCard';

/**
 * Reasoning Stream Animation
 * Shows the "thinking steps" of the AI agent
 */
function ReasoningStream() {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { label: 'Grounding response in data...', duration: 800 },
        { label: 'Analyzing statistical patterns...', duration: 1000 },
        { label: 'Computing evidence objects...', duration: 1200 },
        { label: 'Formulating answer...', duration: 600 },
        { label: 'Verifying lineage...', duration: 400 },
    ];

    useEffect(() => {
        if (currentStep < steps.length) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, steps[currentStep].duration);

            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    return (
        <div className="border-b border-lab-accent/20 p-4 bg-black/20">
            <div className="space-y-2">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className={cn(
                            "flex items-center gap-2 text-xs transition-opacity duration-300",
                            index <= currentStep ? "opacity-100" : "opacity-30"
                        )}
                    >
                        {index < currentStep ? (
                            <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                        ) : index === currentStep ? (
                            <Loader2 className="w-3 h-3 text-lab-accent animate-spin flex-shrink-0" />
                        ) : (
                            <div className="w-3 h-3 rounded-full border border-lab-text/20 flex-shrink-0" />
                        )}
                        <span className={cn(
                            index <= currentStep ? "text-lab-text" : "text-lab-text/40"
                        )}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
