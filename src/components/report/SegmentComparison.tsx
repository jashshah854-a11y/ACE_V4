import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Segment {
    name: string;
    displayName?: string;
    segmentType?: {
        label: string;
        icon: string;
        colorClass: string;
    };
    size: number;
    sizePercent: number;
    avgValue: number;
    riskLevel: "low" | "medium" | "high";
    keyTrait: string;
    differentiator: string;
}

interface SegmentComparisonProps {
    segments: Segment[];
    totalCustomers: number;
    className?: string;
}

export function SegmentComparison({ segments, totalCustomers, className }: SegmentComparisonProps) {
    // Don't render if no meaningful data
    if (!segments || segments.length === 0) return null;

    const sortedSegments = [...segments].sort((a, b) => b.avgValue - a.avgValue);
    const maxValue = Math.max(...segments.map(s => s.avgValue));
    const maxSize = Math.max(...segments.map(s => s.size));

    const riskStyles = {
        low: "border-success/30 bg-success/5",
        medium: "border-warning/30 bg-warning/5",
        high: "border-destructive/30 bg-destructive/5"
    };

    const riskLabels = {
        low: { text: "Low Risk", color: "text-success" },
        medium: { text: "Moderate", color: "text-warning" },
        high: { text: "At Risk", color: "text-destructive" }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn("bg-card border border-border rounded-sm shadow-soft overflow-hidden", className)}
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border bg-muted/30">
                <h3 className="font-serif text-xl font-semibold text-navy-900">
                    Segment Deep Dive
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Detailed comparison of key characteristics and strategic recommendations
                </p>
            </div>

            {/* Segment Cards */}
            <div className="p-6 space-y-4">
                {sortedSegments.map((segment, index) => {
                    const valuePercent = (segment.avgValue / maxValue) * 100;
                    const sizePercent = (segment.size / maxSize) * 100;
                    const risk = riskLabels[segment.riskLevel];
                    const displayName = segment.displayName || segment.name;

                    return (
                        <motion.div
                            key={segment.name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
                            className={cn(
                                "p-5 rounded-sm border-l-4 transition-all duration-300 hover:shadow-soft",
                                riskStyles[segment.riskLevel]
                            )}
                        >
                            {/* Segment Header */}
                            <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                    {index === 0 && (
                                        <span className="text-teal-500 text-xl">★</span>
                                    )}
                                    <div>
                                        <h4 className="font-serif text-lg font-semibold text-navy-900">
                                            {displayName}
                                        </h4>
                                        {segment.segmentType && (
                                            <span className="text-xs text-muted-foreground">
                                                {segment.segmentType.icon} {segment.segmentType.label}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={cn("text-xs font-medium px-2 py-1 rounded", risk.color)}>
                                    {risk.text}
                                </span>
                            </div>

                            {/* Key Trait */}
                            {segment.keyTrait && segment.keyTrait !== "Identified from behavioral patterns" && (
                                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                    {segment.keyTrait}
                                </p>
                            )}

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Size */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Customers
                                    </div>
                                    <div className="font-semibold text-lg text-foreground tabular-nums">
                                        {segment.size.toLocaleString()}
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${sizePercent}%` }}
                                            transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
                                            className="h-full bg-primary/60 rounded-full"
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {segment.sizePercent.toFixed(1)}% of total
                                    </div>
                                </div>

                                {/* Value */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Avg Value
                                    </div>
                                    <div className="font-semibold text-lg text-teal-500 tabular-nums">
                                        ${segment.avgValue.toLocaleString()}
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${valuePercent}%` }}
                                            transition={{ duration: 0.6, delay: 0.25 + index * 0.05 }}
                                            className={cn(
                                                "h-full rounded-full",
                                                valuePercent > 80 ? "bg-teal-500" :
                                                valuePercent > 50 ? "bg-accent" : "bg-warning"
                                            )}
                                        />
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {Math.round(valuePercent)}% of top segment
                                    </div>
                                </div>

                                {/* Share of Revenue */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Revenue Share
                                    </div>
                                    <div className="font-semibold text-lg text-foreground tabular-nums">
                                        {((segment.size * segment.avgValue) / segments.reduce((sum, s) => sum + s.size * s.avgValue, 0) * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Contribution to total
                                    </div>
                                </div>

                                {/* Differentiator */}
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Key Insight
                                    </div>
                                    <div className="text-sm text-foreground leading-relaxed">
                                        {segment.differentiator && segment.differentiator !== "Unique spending and engagement patterns"
                                            ? segment.differentiator
                                            : index === 0 ? "Highest lifetime value" 
                                            : segment.riskLevel === 'high' ? "Needs re-engagement"
                                            : "Growth opportunity"}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Strategic Summary */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="px-6 py-5 border-t border-border bg-navy-50"
            >
                <div className="flex items-start gap-3">
                    <span className="text-teal-500 text-lg">💡</span>
                    <div>
                        <h5 className="font-serif font-semibold text-navy-900 mb-1">
                            Strategic Recommendation
                        </h5>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Prioritize retention for top-value segments while developing targeted 
                            win-back campaigns for at-risk customers. Focus acquisition efforts 
                            on profiles matching your highest-value segments.
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
