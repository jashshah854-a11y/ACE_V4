import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    extractGoverningThought,
    parseSCQABlocks,
    extractSections,
    extractMetrics,
    type SCQABlock
} from '@/lib/reportParser';
import { ConfidenceBadge } from '@/components/trust/ConfidenceBadge';
import { parseGuardrailsText } from '@/lib/getGuidance';

interface NarrativeStreamProps {
    /** Raw markdown content from backend */
    content: string;

    /** Task contract from backend state */
    taskContract?: {
        allowed_sections: string[];
        blocked_agents: string[];
    };

    /** Confidence score (0-1) for safe mode detection */
    confidence?: number;

    /** Callback when user clicks a claim to view evidence */
    onClaimClick?: (evidenceId: string, type: 'business_pulse' | 'predictive_drivers' | 'correlation' | 'quality') => void;
}

/**
 * The Narrative Stream — Center Panel (The Library)
 * 
 * Implements the Pyramid Principle and SCQA Framework:
 * - Answer-First: Governing Thought headline before details
 * - SCQA Blocks: Situation → Complication → Question → Answer
 * - Task Contract: Upfront scope declaration
 * - Click-to-Verify: Interactive claims linked to evidence
 * - Safe Mode: Fallback to descriptive stats when confidence < 0.1
 */
export function NarrativeStream({
    content,
    taskContract,
    confidence = 1.0,
    onClaimClick
}: NarrativeStreamProps) {
    const [activeClaimId, setActiveClaimId] = useState<string | null>(null);

    // Extract narrative components
    const metrics = extractMetrics(content);
    const governingThought = extractGoverningThought(content);
    const scqaBlocks = parseSCQABlocks(content);
    const sections = extractSections(content);
    const guardrailSection = sections.find((section) =>
        section.title.toLowerCase().includes("guardrail") || section.title.toLowerCase().includes("validation")
    );
    const guardrailNotes = guardrailSection ? parseGuardrailsText(guardrailSection.content) : [];

    // Safe mode detection
    const isSafeMode = confidence < 0.1;
    const confidenceLevel = confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";

    // Determine which sections to show based on task contract
    const shouldShowSection = (sectionId: string): boolean => {
        if (!taskContract) return true;

        const { allowed_sections, blocked_agents } = taskContract;

        // Map sections to required agents
        const sectionAgentMap: Record<string, string> = {
            'behavioral-clusters': 'overseer',
            'outcome-modeling': 'regression',
            'personas-strategies': 'fabricator',
            'business-intelligence': 'fabricator',
        };

        const requiredAgent = sectionAgentMap[sectionId];
        if (requiredAgent && blocked_agents.includes(requiredAgent)) {
            return false;
        }

        return allowed_sections.length === 0 || allowed_sections.includes(sectionId);
    };

    // Custom markdown components for interactive claims
    const components = {
        // Intercept strong emphasis for click-to-verify claims
        strong({ children, ...props }: any) {
            const text = String(children);

            // Detect metrics (numbers with %, $, or standalone numbers)
            const isMetric = /[%$]/.test(text) || /^\d+(\.\d+)?$/.test(text);

            if (isMetric && onClaimClick) {
                // Generate evidence ID from text
                const evidenceId = text.toLowerCase().replace(/[^a-z0-9]/g, '-');

                // Determine evidence type based on context
                const evidenceType = text.includes('$') ? 'business_pulse' :
                    text.includes('%') ? 'quality' :
                        'correlation';

                return (
                    <button
                        onClick={() => {
                            setActiveClaimId(evidenceId);
                            onClaimClick(evidenceId, evidenceType);
                        }}
                        className={cn(
                            "claim-interactive font-bold",
                            activeClaimId === evidenceId && "text-authority"
                        )}
                        data-evidence-id={evidenceId}
                        title="Click to view evidence"
                    >
                        {children}
                        <sup className="claim-indicator">[i]</sup>
                    </button>
                );
            }

            return <strong {...props}>{children}</strong>;
        },

        // Custom heading renderer to apply typography
        h1({ children, ...props }: any) {
            return <h1 className="governing-thought" {...props}>{children}</h1>;
        },

        h2({ children, ...props }: any) {
            return <h2 className="font-narrator text-3xl font-bold text-authority mb-4 mt-8" {...props}>{children}</h2>;
        },

        h3({ children, ...props }: any) {
            return <h3 className="font-narrator text-2xl font-semibold text-foreground mb-3 mt-6" {...props}>{children}</h3>;
        },

        // Custom paragraph renderer for narrative body
        p({ children, ...props }: any) {
            return <p className="narrative-body mb-6" {...props}>{children}</p>;
        },
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-breathe">
            {/* Governing Thought — Answer-First Headline */}
            <header className="mb-12 pb-8 border-b border-border">
                <p className="font-data text-xs text-muted-foreground mb-4 uppercase tracking-widest">
                    Intelligence Report // ACE V4 // Neural Refinery
                </p>
                <div className="flex flex-wrap items-start gap-4 mb-4">
                    <h1 className="governing-thought flex-1">
                        {governingThought}
                    </h1>
                    <ConfidenceBadge
                        level={confidenceLevel}
                        score={confidence}
                        showLabel={false}
                        details={{
                            dataCoverage: metrics.dataQualityScore ? `${Math.round(metrics.dataQualityScore)}% coverage` : "Coverage unavailable",
                            validationStatus: guardrailNotes.length ? "Guardrails flagged" : "Passed core checks",
                            sampleSufficiency: metrics.recordsProcessed ? `Rows: ${metrics.recordsProcessed.toLocaleString()}` : "Sample size unknown",
                        }}
                    />
                </div>

                {/* Safe Mode Banner */}
                {isSafeMode && (
                    <div className="mt-6 p-4 bg-quality-medium/10 border-l-4 border-quality-medium rounded-r">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-quality-medium flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-ui text-sm font-semibold text-quality-medium mb-1">
                                    Safe Mode Active
                                </p>
                                <p className="font-ui text-sm text-muted-foreground">
                                    Data confidence below threshold ({(confidence * 100).toFixed(0)}%).
                                    Predictive modeling is paused; descriptive statistics remain available.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {guardrailNotes.length > 0 && (
                    <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-lg">
                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-900 mb-2">
                            Validation & Guardrails
                        </p>
                        <ul className="space-y-1 text-xs text-amber-900/80">
                            {guardrailNotes.slice(0, 4).map((note, idx) => (
                                <li key={idx}>- {note}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </header>

            {/* Task Contract Declaration */}
            {taskContract && (
                <section className="mb-12 p-6 border-l-4 border-action bg-action/5 rounded-r">
                    <div className="flex items-start gap-3 mb-4">
                        <Info className="w-5 h-5 text-action flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-ui text-sm font-semibold text-action mb-2">
                                Analysis Scope & Task Contract
                            </h3>
                            <p className="font-ui text-sm text-foreground mb-3">
                                This report covers the following areas based on data availability and quality:
                            </p>
                        </div>
                    </div>

                    {/* Allowed Sections */}
                    {taskContract.allowed_sections.length > 0 && (
                        <div className="mb-3">
                            <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Included Analysis:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {taskContract.allowed_sections.map((section) => (
                                    <span
                                        key={section}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-quality-high/10 text-quality-high text-xs font-ui font-medium rounded"
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                        {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Blocked Agents / Limitations */}
                    {taskContract.blocked_agents.length > 0 && (
                        <div>
                            <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Not applicable for this dataset:
                            </p>
                            <p className="font-ui text-sm text-muted-foreground">
                                {taskContract.blocked_agents.map(agent => {
                                    const agentLabels: Record<string, string> = {
                                        'overseer': 'Behavioral Clustering',
                                        'regression': 'Predictive Modeling',
                                        'fabricator': 'Persona Generation',
                                        'sentry': 'Anomaly Detection',
                                    };
                                    return agentLabels[agent] || agent;
                                }).join(', ')}
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* SCQA Story Blocks */}
            {scqaBlocks.length > 0 && (
                <div className="space-y-10 mb-12">
                    {scqaBlocks.map((block, index) => (
                        <SCQABlockRenderer key={index} block={block} />
                    ))}
                </div>
            )}

            {/* Main Narrative Content */}
            <article className="prose prose-slate dark:prose-invert prose-lg max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={components}
                >
                    {content}
                </ReactMarkdown>
            </article>

            {/* Zero-Filler Mandate: Show message if content is suspiciously short */}
            {content.length < 500 && (
                <div className="mt-12 p-6 border border-muted rounded-lg bg-muted/20">
                    <p className="font-ui text-sm text-muted-foreground text-center">
                        <AlertTriangle className="w-4 h-4 inline mr-2" />
                        Limited analysis available. Dataset may require additional fields or higher quality data for comprehensive insights.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * SCQA Block Renderer
 * Renders individual Situation-Complication-Question-Answer blocks
 */
interface SCQABlockRendererProps {
    block: SCQABlock;
}

function SCQABlockRenderer({ block }: SCQABlockRendererProps) {
    return (
        <div className="space-y-6">
            {/* Situation: Historical baseline */}
            {block.situation && (
                <div className="scqa-situation p-4 rounded">
                    <p className="font-ui text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Context
                    </p>
                    <div className="font-narrator text-base leading-relaxed">
                        {block.situation}
                    </div>
                </div>
            )}

            {/* Complication: Disruption or anomaly */}
            {block.complication && (
                <div className="scqa-complication p-4 rounded">
                    <p className="font-ui text-xs font-semibold text-quality-medium uppercase tracking-wide mb-2">
                        Complication
                    </p>
                    <div className="font-narrator text-base leading-relaxed">
                        {block.complication}
                    </div>
                </div>
            )}

            {/* Answer: Strategic response */}
            {block.answer && (
                <div className="scqa-answer p-4 rounded">
                    <p className="font-ui text-xs font-semibold text-action uppercase tracking-wide mb-2">
                        Strategic Response
                    </p>
                    <div className="font-narrator text-base leading-relaxed">
                        {block.answer}
                    </div>
                </div>
            )}
        </div>
    );
}
