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
    keyBehavior: string;
    recommendedAction: "Retain" | "Upsell" | "Re-engage" | "Monitor" | "Acquire";
}

interface SegmentOverviewTableProps {
    segments: Segment[];
    totalCustomers: number;
    className?: string;
}

export function SegmentOverviewTable({ segments, totalCustomers, className }: SegmentOverviewTableProps) {
    // Don't render if no meaningful data
    if (!segments || segments.length === 0) return null;

    const riskConfig = {
        low: { bg: "bg-success/10", text: "text-success", label: "Low" },
        medium: { bg: "bg-warning/10", text: "text-warning", label: "Medium" },
        high: { bg: "bg-destructive/10", text: "text-destructive", label: "High" }
    };

    const actionConfig = {
        Retain: { bg: "bg-primary", text: "Retain" },
        Upsell: { bg: "bg-success", text: "Grow" },
        "Re-engage": { bg: "bg-warning", text: "Win Back" },
        Monitor: { bg: "bg-muted-foreground", text: "Monitor" },
        Acquire: { bg: "bg-accent", text: "Acquire" }
    };

    const avgValue = segments.reduce((sum, s) => sum + s.avgValue, 0) / segments.length;
    const sortedSegments = [...segments].sort((a, b) => b.avgValue - a.avgValue);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("bg-card border border-border rounded-sm shadow-soft overflow-hidden", className)}
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border bg-muted/30">
                <h3 className="font-serif text-xl font-semibold text-navy-900">
                    Customer Segments
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    {segments.length} segments identified · {totalCustomers.toLocaleString()} total customers
                </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-muted/20">
                            <th className="text-left py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Segment
                            </th>
                            <th className="text-right py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Size
                            </th>
                            <th className="text-right py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Avg Value
                            </th>
                            <th className="text-center py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Risk
                            </th>
                            <th className="text-center py-3.5 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Strategy
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {sortedSegments.map((segment, idx) => {
                            const risk = riskConfig[segment.riskLevel];
                            const action = actionConfig[segment.recommendedAction];
                            const valueIndex = Math.round((segment.avgValue / avgValue) * 100);

                            return (
                                <motion.tr
                                    key={segment.name}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                    className="hover:bg-muted/20 transition-colors"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {idx === 0 && (
                                                <span className="text-copper-400 text-lg" title="Highest Value">
                                                    ★
                                                </span>
                                            )}
                                            <div>
                                                <span className="font-medium text-foreground">
                                                    {segment.displayName || segment.name}
                                                </span>
                                                {segment.segmentType && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        {segment.segmentType.icon}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="tabular-nums">
                                            <span className="font-semibold text-foreground">
                                                {segment.size.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">
                                                ({segment.sizePercent.toFixed(0)}%)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="tabular-nums">
                                            <span className="font-semibold text-copper-600">
                                                ${segment.avgValue.toLocaleString()}
                                            </span>
                                            <div className="text-xs text-muted-foreground">
                                                {valueIndex}% of avg
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={cn(
                                            "inline-flex px-2.5 py-1 rounded text-xs font-medium",
                                            risk.bg, risk.text
                                        )}>
                                            {risk.label}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={cn(
                                            "inline-flex px-3 py-1.5 rounded text-xs font-medium text-white",
                                            action.bg
                                        )}>
                                            {action.text}
                                        </span>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer Legend */}
            <div className="px-6 py-4 border-t border-border bg-muted/10">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">Retain:</strong> Keep loyal customers</span>
                    <span><strong className="text-foreground">Grow:</strong> Increase wallet share</span>
                    <span><strong className="text-foreground">Win Back:</strong> Re-engage at-risk</span>
                    <span><strong className="text-foreground">Monitor:</strong> Track trends</span>
                </div>
            </div>
        </motion.div>
    );
}
