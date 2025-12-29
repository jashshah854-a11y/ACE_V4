import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Copy, Download, CheckCircle, AlertCircle } from "lucide-react";
import { ConfidenceIndicator, ConfidenceLevel } from "@/components/library/ConfidenceIndicator";

interface EvidenceData {
    id: string;
    claim: string;
    visualProof?: {
        title: string;
        caption: string;
        chart: ReactNode;
    };
    sourceData?: {
        query?: string;
        queryLanguage?: "sql" | "python";
        headers: string[];
        rows: any[][];
        totalRows: number;
    };
    confidence: {
        level: ConfidenceLevel;
        score?: number;
        pValue?: number;
        reasoning?: string;
    };
    warnings?: string[];
}

interface EvidenceRailPanelProps {
    evidence: EvidenceData | null;
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

export function EvidenceRailPanel({
    evidence,
    isOpen,
    onClose,
    className,
}: EvidenceRailPanelProps) {
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

    const handleCopyChart = () => {
        // TODO: Implement chart copy to clipboard
        setCopySuccess("chart");
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleExportData = () => {
        if (!evidence?.sourceData) return;

        // Convert to CSV
        const csv = [
            evidence.sourceData.headers.join(","),
            ...evidence.sourceData.rows.map((row) => row.join(",")),
        ].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evidence_${evidence.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setCopySuccess("data");
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handleCopyQuery = () => {
        if (!evidence?.sourceData?.query) return;
        navigator.clipboard.writeText(evidence.sourceData.query);
        setCopySuccess("query");
        setTimeout(() => setCopySuccess(null), 2000);
    };

    if (!evidence) {
        return (
            <aside
                className={cn(
                    "w-96 border-l border-[hsl(var(--lab-border))] bg-[hsl(var(--lab-charcoal))] overflow-y-auto transition-transform duration-300",
                    !isOpen && "translate-x-full",
                    className
                )}
            >
                <div className="p-6 h-full flex items-center justify-center">
                    <p className="text-[hsl(var(--lab-silver))]/40 font-[family-name:var(--font-lab)] text-sm text-center">
                        Select any highlighted claim to see the proof
                    </p>
                </div>
            </aside>
        );
    }

    return (
        <aside
            className={cn(
                "w-96 border-l border-[hsl(var(--lab-border))] bg-[hsl(var(--lab-charcoal))] overflow-y-auto transition-transform duration-300",
                !isOpen && "translate-x-full",
                className
            )}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[hsl(var(--lab-charcoal))] border-b border-[hsl(var(--lab-border))] p-4 flex items-center justify-between">
                <h3 className="font-[family-name:var(--font-lab)] text-sm uppercase tracking-wider text-[hsl(var(--lab-signal))]">
                    Evidence
                </h3>
                <button
                    onClick={onClose}
                    className="text-[hsl(var(--lab-silver))]/60 hover:text-[hsl(var(--lab-silver))] transition-colors"
                    aria-label="Close evidence panel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Claim Reference */}
                <div className="pb-4 border-b border-[hsl(var(--lab-border))]">
                    <p className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))]/60 mb-2">
                        Claim
                    </p>
                    <p className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-silver))]">
                        "{evidence.claim}"
                    </p>
                </div>

                {/* Visual Proof */}
                {evidence.visualProof && (
                    <div className="visual-proof">
                        <h4 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-3">
                            {evidence.visualProof.title}
                        </h4>
                        <div className="bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded-lg p-4">
                            {evidence.visualProof.chart}
                        </div>
                        <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/60 mt-2">
                            {evidence.visualProof.caption}
                        </p>
                    </div>
                )}

                {/* Source Data */}
                {evidence.sourceData && (
                    <div className="source-data">
                        <h4 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-3">
                            Source Data
                        </h4>

                        {/* Query */}
                        {evidence.sourceData.query && (
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/60">
                                        {evidence.sourceData.queryLanguage?.toUpperCase() || "QUERY"}
                                    </span>
                                    <button
                                        onClick={handleCopyQuery}
                                        className="text-[hsl(var(--lab-signal))] hover:text-[hsl(var(--lab-signal))]/80 transition-colors"
                                    >
                                        {copySuccess === "query" ? (
                                            <CheckCircle className="w-3 h-3" />
                                        ) : (
                                            <Copy className="w-3 h-3" />
                                        )}
                                    </button>
                                </div>
                                <pre className="bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded p-3 overflow-x-auto">
                                    <code className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]">
                                        {evidence.sourceData.query}
                                    </code>
                                </pre>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full font-[family-name:var(--font-lab)] text-xs">
                                    <thead>
                                        <tr className="border-b border-[hsl(var(--lab-border))]">
                                            {evidence.sourceData.headers.map((header, idx) => (
                                                <th
                                                    key={idx}
                                                    className="text-left px-3 py-2 text-[hsl(var(--lab-signal))] font-medium"
                                                >
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evidence.sourceData.rows.slice(0, 5).map((row, rowIdx) => (
                                            <tr
                                                key={rowIdx}
                                                className="border-b border-[hsl(var(--lab-border))]/30 hover:bg-[hsl(var(--lab-border))]/20"
                                            >
                                                {row.map((cell, cellIdx) => (
                                                    <td
                                                        key={cellIdx}
                                                        className="px-3 py-2 text-[hsl(var(--lab-silver))]"
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-3 py-2 bg-[hsl(var(--lab-border))]/10 border-t border-[hsl(var(--lab-border))]">
                                <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/60">
                                    Showing first 5 of {evidence.sourceData.totalRows.toLocaleString()} rows
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Confidence Score */}
                <div className="confidence-score">
                    <h4 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-3">
                        Statistical Certainty
                    </h4>

                    <div className="space-y-3">
                        <ConfidenceIndicator
                            level={evidence.confidence.level}
                            score={evidence.confidence.score}
                            showLabel
                            showScore
                        />

                        {evidence.confidence.pValue !== undefined && (
                            <div className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/60">
                                p-value: {evidence.confidence.pValue.toFixed(4)}
                            </div>
                        )}

                        {evidence.confidence.reasoning && (
                            <p className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-silver))]">
                                {evidence.confidence.reasoning}
                            </p>
                        )}

                        {/* Warnings for low confidence */}
                        {evidence.confidence.level === "low" && (
                            <div className="flex items-start gap-2 p-3 bg-[hsl(var(--lab-alert))]/10 border border-[hsl(var(--lab-alert))]/30 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-[hsl(var(--lab-alert))] flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-[family-name:var(--font-lab)] text-xs font-medium text-[hsl(var(--lab-alert))] mb-1">
                                        Tentative Finding
                                    </p>
                                    <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/80">
                                        Sample size is small. Treat this trend as tentative.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Additional warnings */}
                        {evidence.warnings && evidence.warnings.length > 0 && (
                            <div className="space-y-2">
                                {evidence.warnings.map((warning, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 bg-[hsl(var(--lab-alert))]/5 border border-[hsl(var(--lab-alert))]/20 rounded"
                                    >
                                        <AlertCircle className="w-3 h-3 text-[hsl(var(--lab-alert))] flex-shrink-0 mt-0.5" />
                                        <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--lab-silver))]/80">
                                            {warning}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Export Actions */}
                <div className="export-actions pt-4 border-t border-[hsl(var(--lab-border))] space-y-2">
                    {evidence.visualProof && (
                        <Button
                            onClick={handleCopyChart}
                            variant="outline"
                            className="w-full justify-start gap-2 font-[family-name:var(--font-lab)] text-sm"
                            disabled={copySuccess === "chart"}
                        >
                            {copySuccess === "chart" ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Chart Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy Chart
                                </>
                            )}
                        </Button>
                    )}

                    {evidence.sourceData && (
                        <Button
                            onClick={handleExportData}
                            variant="outline"
                            className="w-full justify-start gap-2 font-[family-name:var(--font-lab)] text-sm"
                            disabled={copySuccess === "data"}
                        >
                            {copySuccess === "data" ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Data Exported
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Export Data (CSV)
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </aside>
    );
}
