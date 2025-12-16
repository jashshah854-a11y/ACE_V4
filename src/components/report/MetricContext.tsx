import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricContextProps {
    value: number;
    label: string;
    range?: {
        min: number;
        max: number;
        good?: number;
        excellent?: number;
    };
    explanation?: string;
    format?: "decimal" | "percentage" | "integer";
    unit?: string;
}

export function MetricContext({
    value,
    label,
    range,
    explanation,
    format = "decimal",
    unit = "",
}: MetricContextProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Format the value
    const formattedValue = formatValue(value, format);

    // Determine quality level
    const quality = range ? getQualityLevel(value, range) : null;

    // Get quality color and label
    const qualityConfig = {
        low: { color: "text-red-600", bg: "bg-red-50", label: "Low" },
        medium: { color: "text-yellow-600", bg: "bg-yellow-50", label: "Fair" },
        high: { color: "text-green-600", bg: "bg-green-50", label: "Good" },
        excellent: { color: "text-blue-600", bg: "bg-blue-50", label: "Excellent" },
    };

    return (
        <div className="inline-flex items-center gap-2">
            <span className="font-medium">{label}:</span>
            <span className="font-semibold">
                {formattedValue}
                {unit}
            </span>

            {quality && (
                <span
                    className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        qualityConfig[quality].color,
                        qualityConfig[quality].bg
                    )}
                >
                    {qualityConfig[quality].label}
                </span>
            )}

            {explanation && (
                <div className="relative">
                    <button
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="More information"
                    >
                        <Info className="h-4 w-4" />
                    </button>

                    {showTooltip && (
                        <div className="absolute left-0 top-6 z-50 w-64 rounded-lg border bg-popover p-3 shadow-lg">
                            <p className="text-sm text-popover-foreground">{explanation}</p>
                        </div>
                    )}
                </div>
            )}

            {range && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Range: {range.min}</span>
                    <span>•</span>
                    <span>{range.max}</span>
                </div>
            )}
        </div>
    );
}

function formatValue(value: number, format: string): string {
    switch (format) {
        case "percentage":
            return `${(value * 100).toFixed(1)}%`;
        case "integer":
            return Math.round(value).toString();
        case "decimal":
        default:
            return value.toFixed(3);
    }
}

function getQualityLevel(
    value: number,
    range: { min: number; max: number; good?: number; excellent?: number }
): "low" | "medium" | "high" | "excellent" {
    const normalized = (value - range.min) / (range.max - range.min);

    if (range.excellent && normalized >= range.excellent) return "excellent";
    if (range.good && normalized >= range.good) return "high";
    if (normalized >= 0.5) return "medium";
    return "low";
}
