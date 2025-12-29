import { cn } from "@/lib/utils";

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
    className?: string;
}

export function DatasetIdentityCard({
    schema,
    volume,
    quality,
    dataType,
    className,
}: DatasetIdentityCardProps) {
    return (
        <div className={cn("w-full max-w-4xl mx-auto", className)}>
            {/* Header - Library Aesthetic */}
            <div className="bg-[hsl(var(--library-bg))] px-8 py-6 border-b border-[hsl(var(--library-muted))]/20">
                <h2 className="font-[family-name:var(--font-library-heading)] text-3xl text-[hsl(var(--library-text))] mb-2">
                    Dataset Identity
                </h2>
                <p className="font-[family-name:var(--font-library-body)] text-[hsl(var(--library-muted))] text-sm">
                    What we see in your data
                </p>
            </div>

            {/* Body - Mixed Aesthetic */}
            <div className="bg-white border-x border-b border-[hsl(var(--library-muted))]/20 rounded-b-lg">
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
                            Quality
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
                                    <span className="text-[hsl(var(--lab-signal))] font-medium">
                                        {Math.round(quality.overall * 100)}%
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
            </div>
        </div>
    );
}
