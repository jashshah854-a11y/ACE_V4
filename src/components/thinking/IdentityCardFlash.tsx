import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DatasetInfo {
    volume: {
        rows: number;
        columns: number;
        sizeMB: number;
    };
    quality: {
        completeness: number;
        validity: number;
        overall: number;
    };
    constraints?: string[];
    dataType?: string;
}

interface IdentityCardFlashProps {
    datasetInfo: DatasetInfo;
    onComplete?: () => void;
    duration?: number; // milliseconds
}

export function IdentityCardFlash({
    datasetInfo,
    onComplete,
    duration = 2500
}: IdentityCardFlashProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Fade in
        const fadeInTimer = setTimeout(() => setIsVisible(true), 100);

        // Fade out and complete
        const fadeOutTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onComplete?.(), 400); // Wait for fade-out animation
        }, duration);

        return () => {
            clearTimeout(fadeInTimer);
            clearTimeout(fadeOutTimer);
        };
    }, [duration, onComplete]);

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--lab-charcoal))]/95 backdrop-blur-sm transition-opacity duration-400",
                isVisible ? "opacity-100" : "opacity-0"
            )}
        >
            <div
                className={cn(
                    "w-full max-w-2xl mx-4 transform transition-all duration-400",
                    isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                )}
            >
                {/* Dossier-Style Card */}
                <div className="bg-[hsl(var(--library-bg))] border-2 border-[hsl(var(--lab-signal))] rounded-lg overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="bg-[hsl(var(--lab-signal))]/10 border-b border-[hsl(var(--lab-signal))]/30 px-6 py-4">
                        <h2 className="font-[family-name:var(--font-library-heading)] text-2xl text-[hsl(var(--library-text))]">
                            Dataset Identity
                        </h2>
                        <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--library-muted))] mt-1">
                            What the system sees
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Volume */}
                        <div>
                            <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-3">
                                Volume
                            </h3>
                            <div className="grid grid-cols-3 gap-4 font-[family-name:var(--font-lab)] text-sm">
                                <div>
                                    <div className="text-[hsl(var(--library-muted))] text-xs">Rows</div>
                                    <div className="text-[hsl(var(--library-text))] font-medium text-lg">
                                        {datasetInfo.volume.rows.toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[hsl(var(--library-muted))] text-xs">Columns</div>
                                    <div className="text-[hsl(var(--library-text))] font-medium text-lg">
                                        {datasetInfo.volume.columns}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[hsl(var(--library-muted))] text-xs">Size</div>
                                    <div className="text-[hsl(var(--library-text))] font-medium text-lg">
                                        {datasetInfo.volume.sizeMB.toFixed(1)} MB
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quality Score */}
                        <div>
                            <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-3">
                                Data Integrity
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[hsl(var(--lab-signal))] transition-all duration-1000"
                                            style={{ width: `${datasetInfo.quality.overall * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="font-[family-name:var(--font-lab)] text-lg font-medium text-[hsl(var(--lab-signal))]">
                                    {datasetInfo.quality.overall >= 0.8 ? "High" : datasetInfo.quality.overall >= 0.5 ? "Moderate" : "Low"}
                                </div>
                            </div>
                        </div>

                        {/* Constraints (if any) */}
                        {datasetInfo.constraints && datasetInfo.constraints.length > 0 && (
                            <div>
                                <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-alert))] mb-3">
                                    Constraints
                                </h3>
                                <ul className="space-y-1 font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--library-muted))]">
                                    {datasetInfo.constraints.map((constraint, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-[hsl(var(--lab-alert))]">•</span>
                                            <span>{constraint}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Data Type */}
                        {datasetInfo.dataType && (
                            <div className="pt-4 border-t border-[hsl(var(--library-muted))]/20">
                                <div className="inline-block px-3 py-1.5 bg-[hsl(var(--lab-signal))]/10 border border-[hsl(var(--lab-signal))]/30 rounded-md">
                                    <span className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-signal))]">
                                        {datasetInfo.dataType.replace(/_/g, " ")}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress indicator */}
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center gap-2 text-[hsl(var(--lab-silver))] font-[family-name:var(--font-lab)] text-xs">
                        <div className="flex gap-1">
                            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                        </div>
                        <span>Proceeding to analysis</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
