import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Constraint {
    type: "missing_field" | "sparse_data" | "invalid_format" | "other";
    severity: "warning" | "error";
    message: string;
    impact: string;
}

interface DatasetIdentityCardProps {
    schema: {
        field: string;
        type: string;
        sample?: string;
    }[];
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
    dataType?: string;
    entityDomain?: string; // NEW: What the data represents
    constraints?: Constraint[]; // NEW: Validation issues
    isScanning?: boolean; // NEW: Loading state
    onAccept?: () => void; // NEW: Continue button
    className?: string;
}

export function DatasetIdentityCard({
    schema,
    volume,
    quality,
    dataType,
    entityDomain,
    constraints = [],
    isScanning = false,
    onAccept,
    className,
}: DatasetIdentityCardProps) {
    const hasWarnings = constraints.some((c) => c.severity === "warning");
    const hasErrors = constraints.some((c) => c.severity === "error");
    const isClean = constraints.length === 0 && quality.overall >= 0.7;

    if (isScanning) {
        return (
            <div className={cn("w-full max-w-4xl mx-auto", className)}>
                <div className="bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded-lg p-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-[hsl(var(--lab-signal))] animate-spin" />
                        <p className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-silver))]">
                            The Sentry is verifying data structure...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
            {/* Header - Library Aesthetic */}
            <div className="bg-[hsl(var(--library-bg))] px-8 py-6 border-b border-[hsl(var(--library-muted))]/20">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="font-[family-name:var(--font-library-heading)] text-3xl text-[hsl(var(--library-text))] mb-2">
                            Dataset Identity
                        </h2>
                        <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] text-sm">
                            What the system sees
                        </p>
                    </div>

                    {/* Integrity Badge */}
                    {isClean && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--lab-signal))]/10 border border-[hsl(var(--lab-signal))]/30 rounded-md">
                            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--lab-signal))]" />
                            <span className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-signal))]">
                                Integrity Verified
                            </span>
                        </div>
                    )}
                    {(hasWarnings || hasErrors) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--lab-alert))]/10 border border-[hsl(var(--lab-alert))]/30 rounded-md">
                            <AlertCircle className="w-4 h-4 text-[hsl(var(--lab-alert))]" />
                            <span className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-alert))]">
                                Constraint Warning
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Body - Mixed Aesthetic */}
            <div className="bg-white border-x border-b border-[hsl(var(--library-muted))]/20">
                {/* Entity Domain (if detected) */}
                {entityDomain && (
                    <div className="px-8 pt-6">
                        <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-2">
                            Entity Domain
                        </h3>
                        <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-text))] text-lg">
                            {entityDomain}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                    {/* Volume Metrics - Lab Style */}
                    <div className="space-y-3">
                        <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-4">
                            Volume
                        </h3>
                        <div className="space-y-2 font-[family-name:var(--font-lab)] text-sm">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--library-muted))]">Rows</span>
                                <span className="text-[hsl(var(--library-text))] font-medium">
                                    {volume.rows.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--library-muted))]">Columns</span>
                                <span className="text-[hsl(var(--library-text))] font-medium">
                                    {volume.columns}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--library-muted))]">Size</span>
                                <span className="text-[hsl(var(--library-text))] font-medium">
                                    {volume.sizeMB.toFixed(2)} MB
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quality Score - Lab Style */}
                    <div className="space-y-3">
                        <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-4">
                            Data Integrity
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between mb-1 font-[family-name:var(--font-lab)] text-xs">
                                    <span className="text-[hsl(var(--library-muted))]">Completeness</span>
                                    <span className="text-[hsl(var(--library-text))]">
                                        {Math.round(quality.completeness * 100)}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[hsl(var(--lab-signal))] transition-all"
                                        style={{ width: `${quality.completeness * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-1 font-[family-name:var(--font-lab)] text-xs">
                                    <span className="text-[hsl(var(--library-muted))]">Validity</span>
                                    <span className="text-[hsl(var(--library-text))]">
                                        {Math.round(quality.validity * 100)}%
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[hsl(var(--lab-signal))] transition-all"
                                        style={{ width: `${quality.validity * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-[hsl(var(--library-muted))]/20">
                                <div className="flex justify-between font-[family-name:var(--font-lab)] text-sm">
                                    <span className="text-[hsl(var(--library-text))] font-medium">Overall</span>
                                    <span className={cn(
                                        "font-medium",
                                        quality.overall >= 0.7 ? "text-[hsl(var(--lab-signal))]" : "text-[hsl(var(--lab-alert))]"
                                    )}>
                                        {quality.overall >= 0.8 ? "High" : quality.overall >= 0.5 ? "Moderate" : "Low"} ({Math.round(quality.overall * 100)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Type - Library Style */}
                    <div className="space-y-3">
                        <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-4">
                            Classification
                        </h3>
                        {dataType && (
                            <div className="inline-block px-3 py-1.5 bg-[hsl(var(--lab-signal))]/10 border border-[hsl(var(--lab-signal))]/30 rounded-md">
                                <span className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--lab-signal))]">
                                    {dataType.replace(/_/g, " ")}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Constraints Section (NEW) */}
                {constraints.length > 0 && (
                    <div className="px-8 pb-6">
                        <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-alert))] mb-4">
                            Constraints
                        </h3>
                        <div className="space-y-3">
                            {constraints.map((constraint, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-3 p-3 bg-[hsl(var(--lab-alert))]/5 border border-[hsl(var(--lab-alert))]/20 rounded-lg"
                                >
                                    <AlertCircle className="w-4 h-4 text-[hsl(var(--lab-alert))] flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-[family-name:var(--font-lab)] text-sm text-[hsl(var(--library-text))]">
                                            {constraint.message}
                                        </p>
                                        <p className="font-[family-name:var(--font-lab)] text-xs text-[hsl(var(--library-muted))] mt-1">
                                            → {constraint.impact}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Schema Preview - Lab Style */}
                <div className="px-8 pb-8">
                    <h3 className="font-[family-name:var(--font-lab)] text-xs uppercase tracking-wider text-[hsl(var(--lab-signal))] mb-4">
                        Schema ({schema.length} fields detected)
                    </h3>
                    <div className="bg-[hsl(var(--lab-charcoal))] rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2 font-[family-name:var(--font-lab)] text-sm">
                            {schema.slice(0, 10).map((field, index) => (
                                <div key={index} className="flex items-start gap-4">
                                    <span className="text-[hsl(var(--lab-signal))] min-w-[200px]">
                                        {field.field}
                                    </span>
                                    <span className="text-[hsl(var(--lab-silver))]/60 min-w-[100px]">
                                        {field.type}
                                    </span>
                                    {field.sample && (
                                        <span className="text-[hsl(var(--lab-silver))]/40 truncate">
                                            {field.sample}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {schema.length > 10 && (
                                <div className="text-[hsl(var(--lab-silver))]/40 text-xs pt-2">
                                    ... and {schema.length - 10} more fields
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Accept/Continue Button (NEW) */}
                {onAccept && (
                    <div className="px-8 pb-8 flex justify-end">
                        <Button
                            onClick={onAccept}
                            className="bg-[hsl(var(--lab-signal))] hover:bg-[hsl(var(--lab-signal))]/90"
                        >
                            Continue to Task Contract
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
