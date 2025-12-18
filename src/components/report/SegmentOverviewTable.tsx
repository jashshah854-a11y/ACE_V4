import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Segment {
    name: string;
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
    const riskConfig = {
        low: { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Low Risk" },
        medium: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "Medium Risk" },
        high: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "High Risk" }
    };

    const actionConfig = {
        Retain: { color: "bg-blue-500", icon: TrendingUp },
        Upsell: { color: "bg-green-500", icon: TrendingUp },
        "Re-engage": { color: "bg-orange-500", icon: TrendingDown },
        Monitor: { color: "bg-slate-500", icon: Minus },
        Acquire: { color: "bg-purple-500", icon: TrendingUp }
    };

    const avgValue = segments.reduce((sum, s) => sum + s.avgValue, 0) / segments.length;
    const sortedSegments = [...segments].sort((a, b) => b.avgValue - a.avgValue);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={className}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Segment Overview
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Quick reference for all {segments.length} identified segments with recommended actions
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 font-semibold text-sm">Segment</th>
                                    <th className="text-right py-3 px-4 font-semibold text-sm">Size</th>
                                    <th className="text-right py-3 px-4 font-semibold text-sm">Value Index</th>
                                    <th className="text-center py-3 px-4 font-semibold text-sm">Risk</th>
                                    <th className="text-left py-3 px-4 font-semibold text-sm">Key Behavior</th>
                                    <th className="text-center py-3 px-4 font-semibold text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSegments.map((segment, idx) => {
                                    const risk = riskConfig[segment.riskLevel];
                                    const valueIndex = (segment.avgValue / avgValue * 100).toFixed(0);
                                    const action = actionConfig[segment.recommendedAction];
                                    const ActionIcon = action.icon;

                                    return (
                                        <motion.tr
                                            key={segment.name}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {idx === 0 && (
                                                        <span className="text-yellow-500" title="Highest Value">
                                                            ⭐
                                                        </span>
                                                    )}
                                                    <span className="font-medium">{segment.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="text-sm">
                                                    <div className="font-semibold">{segment.size.toLocaleString()}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {segment.sizePercent.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={cn(
                                                        "font-semibold text-sm",
                                                        parseInt(valueIndex) > 120 ? "text-green-600" :
                                                        parseInt(valueIndex) > 80 ? "text-blue-600" :
                                                        "text-orange-600"
                                                    )}>
                                                        {valueIndex}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">/ 100</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <Badge variant="outline" className={cn("text-xs", risk.color, risk.bg)}>
                                                    {risk.label}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm text-muted-foreground">
                                                    {segment.keyBehavior}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className={cn("p-1.5 rounded", action.color)}>
                                                        <ActionIcon className="h-3 w-3 text-white" />
                                                    </div>
                                                    <span className="text-sm font-medium">{segment.recommendedAction}</span>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                        <p>
                            <strong>Value Index:</strong> Relative customer value (100 = average).{" "}
                            <strong>Actions:</strong> Retain = keep loyal, Upsell = grow value, Re-engage = win back, Monitor = watch trends, Acquire = target similar prospects.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
