import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
    name: string;
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
    const riskConfig = {
        low: { color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/20", label: "Low Risk" },
        medium: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/20", label: "Medium Risk" },
        high: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/20", label: "High Risk" }
    };

    const sortedSegments = [...segments].sort((a, b) => b.avgValue - a.avgValue);
    const maxValue = Math.max(...segments.map(s => s.avgValue));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={className}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Segment Comparison Matrix
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                        Compare key characteristics across all {segments.length} identified customer segments
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {sortedSegments.map((segment, index) => {
                            const risk = riskConfig[segment.riskLevel];
                            const valuePercent = (segment.avgValue / maxValue) * 100;

                            return (
                                <motion.div
                                    key={segment.name}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-lg font-semibold text-foreground">
                                                        {segment.name}
                                                    </h4>
                                                    {index === 0 && (
                                                        <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                                                            Highest Value
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{segment.keyTrait}</p>
                                            </div>
                                            <Badge variant="outline" className={cn(risk.color, risk.bg)}>
                                                {risk.label}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <Users className="h-3 w-3" />
                                                    <span>Segment Size</span>
                                                </div>
                                                <div className="font-bold text-lg text-foreground">
                                                    {segment.size.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {segment.sizePercent.toFixed(1)}% of total
                                                </div>
                                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${segment.sizePercent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <DollarSign className="h-3 w-3" />
                                                    <span>Avg Customer Value</span>
                                                </div>
                                                <div className="font-bold text-lg text-foreground">
                                                    ${segment.avgValue.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {((segment.avgValue / maxValue) * 100).toFixed(0)}% of top segment
                                                </div>
                                                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                                    <div
                                                        className={cn(
                                                            "h-full",
                                                            valuePercent > 80 ? "bg-green-500" :
                                                                valuePercent > 50 ? "bg-yellow-500" : "bg-orange-500"
                                                        )}
                                                        style={{ width: `${valuePercent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span>Key Differentiator</span>
                                                </div>
                                                <div className="text-sm text-foreground font-medium leading-relaxed">
                                                    {segment.differentiator}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-start gap-3">
                            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h5 className="font-semibold text-sm mb-1">Segment Strategy Recommendation</h5>
                                <p className="text-sm text-muted-foreground">
                                    Focus retention efforts on high-value segments while developing targeted
                                    acquisition strategies for under-represented profitable segments.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
