import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface NarrativeStreamProps {
    content: string;  // Markdown report content
    onClaimClick?: (claimId: string) => void;
    className?: string;
}

interface ParsedClaim {
    id: string;
    text: string;
    confidence?: number;
    startIndex: number;
    endIndex: number;
}

/**
 * Narrative Stream - The Library
 * 
 * Center panel of Intelligence Canvas rendering the analysis report
 * with hyper-linked claims. Uses serif typography for readability.
 */
export function NarrativeStream({ content, onClaimClick, className }: NarrativeStreamProps) {
    const [activeClaim, setActiveClaim] = useState<string | null>(null);

    // Detect claims in markdown (simple pattern matching for now)
    const claims = useMemo(() => detectClaims(content), [content]);

    const handleClaimClick = (claimId: string) => {
        setActiveClaim(claimId);
        onClaimClick?.(claimId);
    };

    return (
        <main className={cn("narrative-stream  overflow-y-auto", className)}>
            <div className="max-w-[800px] mx-auto px-8 py-12">
                <article className="prose prose-lg prose-stone max-w-none">
                    {/* Custom markdown renderer with claim detection */}
                    <ReactMarkdown
                        components={{
                            // Override strong/bold to detect claims
                            strong: ({ node, ...props }) => {
                                const text = String(props.children);

                                // Check if this is a claim (contains percentage or number)
                                const hasClaim = /\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?/.test(text);

                                if (hasClaim) {
                                    const claimId = `claim_${text.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
                                    return (
                                        <ClaimButton
                                            id={claimId}
                                            text={text}
                                            isActive={activeClaim === claimId}
                                            onClick={() => handleClaimClick(claimId)}
                                        />
                                    );
                                }

                                return <strong {...props} />;
                            }
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </article>
            </div>
        </main>
    );
}

/* Hyper-Linked Claim Button */
interface ClaimButtonProps {
    id: string;
    text: string;
    isActive: boolean;
    onClick: () => void;
}

function ClaimButton({ id, text, isActive, onClick }: ClaimButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "inline font-bold transition-all duration-200",
                "border-b-2 border-dashed border-neural-blue/60",
                "hover:border-solid hover:bg-neural-blue/10",
                "px-1 -mx-1 rounded",
                isActive && "claim-active bg-neural-blue/20 border-solid"
            )}
            title="Click to view evidence"
        >
            {text}
            <span className="ml-1 text-xs text-neural-blue">▸</span>
        </button>
    );
}

/* Simple claim detection */
function detectClaims(markdown: string): ParsedClaim[] {
    const claims: ParsedClaim[] = [];

    // Pattern: Bold text with metrics (**text with 15%**)
    const boldMetricPattern = /\*\*([^*]+(?:\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?)[^*]+)\*\*/g;

    let match;
    while ((match = boldMetricPattern.exec(markdown)) !== null) {
        claims.push({
            id: `claim_${match[1].replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
            text: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }

    return claims;
}
