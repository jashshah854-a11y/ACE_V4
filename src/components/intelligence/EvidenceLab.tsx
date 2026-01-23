import { useState } from "react";
import { cn } from "@/lib/utils";

export interface EvidenceObject {
    claim: string;
    evidence: {
        metric: string;
        value: number | string;
        sample_size?: number;
        source_columns: string[];
        methodology: string;
        timestamp?: string;
    };
    severity?: "info" | "warning" | "critical";
    artifact_path?: string;
}

interface EvidenceLabProps {
    activeEvidence: EvidenceObject | null;
    className?: string;
}

/**
 * Evidence Lab - The Proof
 * 
 * Right panel of Intelligence Canvas showing raw evidence backing claims.
 * Uses monospace typography and terminal aesthetic.
 */
export function EvidenceLab({ activeEvidence, className }: EvidenceLabProps) {
    const [copySuccess, setCopySuccess] = useState(false);

    if (!activeEvidence) {
        return null;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(activeEvidence, null, 2));
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <aside className={cn("evidence-lab overflow-y-auto", className)}>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-text-secondary">
                            Evidence Lab
                        </h2>
                        <p className="text-xs text-text-muted font-mono mt-1">
                            The Proof
                        </p>
                    </div>

                    <button
                            onClick={handleCopy}
                            className="text-xs font-mono px-3 py-1 rounded bg-midnight hover:bg-neural-blue/20 transition-colors border border-glass-border"
                            title="Copy evidence to clipboard"
                        >
                            {copySuccess ? "✓ Copied" : "Copy JSON"}
                        </button>
                </div>

                {/* Evidence Display */}
                
                    <div className="space-y-4">
                        {/* Claim Header */}
                        <div className="p-4 bg-midnight rounded border border-glass-border">
                            <div className="text-xs text-text-muted font-mono mb-2">CLAIM</div>
                            <div className="text-sm text-text-primary">{activeEvidence.claim}</div>

                            {activeEvidence.severity && (
                                <div className="flex gap-4 mt-3 text-xs font-mono">
                                    <div>
                                        <span className="text-text-muted">Level: </span>
                                        <span className="text-pulse uppercase">{activeEvidence.severity}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Evidence JSON */}
                        <div className="p-4 bg-void rounded border border-glass-border">
                            <div className="text-xs text-text-muted font-mono mb-3">EVIDENCE</div>
                            <pre className="text-xs overflow-x-auto evidence-json">
                                <code>{JSON.stringify(activeEvidence.evidence, null, 2)}</code>
                            </pre>
                        </div>

                        {/* Metadata */}
                        <div className="p-4 bg-midnight rounded border border-glass-border">
                            <div className="text-xs text-text-muted font-mono mb-2">METADATA</div>
                            <div className="space-y-1 text-xs font-mono">
                                <div>
                                    <span className="text-text-muted">Methodology: </span>
                                    <span className="text-neural-blue">{activeEvidence.evidence.methodology}</span>
                                </div>
                                {activeEvidence.evidence.sample_size && (
                                    <div>
                                        <span className="text-text-muted">Sample Size: </span>
                                        <span className="text-text-primary">{activeEvidence.evidence.sample_size.toLocaleString()}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-text-muted">Source Columns: </span>
                                    <span className="text-text-primary">{activeEvidence.evidence.source_columns.join(", ")}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                
            </div>
        </aside>
    );
}


