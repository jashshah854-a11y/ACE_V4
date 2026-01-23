import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ConfidenceLevel = "high" | "moderate" | "low";

interface TraceableTextProps {
    children: ReactNode;
    claims?: ClaimSegment[];
    onClaimClick?: (evidenceId: string) => void;
    className?: string;
}

interface ClaimSegment {
    text: string;
    evidenceId?: string;
    confidence?: ConfidenceLevel;
}

export function TraceableText({
    children,
    claims,
    onClaimClick,
    className,
}: TraceableTextProps) {
    // If no claims provided, render children as-is
    if (!claims || claims.length === 0) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={cn("traceable-text", className)}>
            {claims.map((segment, index) => {
                if (segment.evidenceId && segment.confidence) {
                    return (
                        <TraceableClaim
                            key={index}
                            evidenceId={segment.evidenceId}
                            confidence={segment.confidence}
                            onClick={onClaimClick}
                        >
                            {segment.text}
                        </TraceableClaim>
                    );
                }
                return <span key={index}>{segment.text}</span>;
            })}
        </div>
    );
}

interface TraceableClaimProps {
    evidenceId: string;
    confidence: ConfidenceLevel;
    onClick?: (evidenceId: string) => void;
    children: ReactNode;
}

export function TraceableClaim({
    evidenceId,
    onClick,
    children,
}: TraceableClaimProps) {
    const handleClick = () => {
        onClick?.(evidenceId);
    };

    return (
        <span
            onClick={handleClick}
            className={cn(
                "traceable-claim cursor-pointer transition-all duration-200 rounded px-1",
                "underline decoration-[hsl(var(--lab-signal))] decoration-2",
                "hover:bg-[hsl(var(--lab-signal))]/10",
            )}
            style={{
                textUnderlineOffset: "3px",
            }}
            title="Click to see proof"
        >
            {children}
        </span>
    );
}

// Helper function to parse text with claims
export function parseTextWithClaims(
    text: string,
    claimMap: Map<string, { evidenceId: string; confidence: ConfidenceLevel }>
): ClaimSegment[] {
    const segments: ClaimSegment[] = [];
    let currentIndex = 0;

    // Sort claims by position in text
    const sortedClaims = Array.from(claimMap.entries()).sort((a, b) => {
        const posA = text.indexOf(a[0]);
        const posB = text.indexOf(b[0]);
        return posA - posB;
    });

    sortedClaims.forEach(([claimText, claimData]) => {
        const claimIndex = text.indexOf(claimText, currentIndex);

        if (claimIndex !== -1) {
            // Add text before claim
            if (claimIndex > currentIndex) {
                segments.push({
                    text: text.substring(currentIndex, claimIndex),
                });
            }

            // Add claim
            segments.push({
                text: claimText,
                evidenceId: claimData.evidenceId,
                confidence: claimData.confidence,
            });

            currentIndex = claimIndex + claimText.length;
        }
    });

    // Add remaining text
    if (currentIndex < text.length) {
        segments.push({
            text: text.substring(currentIndex),
        });
    }

    return segments;
}
