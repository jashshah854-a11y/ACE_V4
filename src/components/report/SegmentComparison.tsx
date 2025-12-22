import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Lightbulb, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        low: { color: "text-success", bg: "bg-success/8", label: "Low Risk" },
        medium: { color: "text-warning", bg: "bg-warning/8", label: "Medium Risk" },
        high: { color: "text-destructive", bg: "bg-destructive/8", label: "High Risk" }
    };

    const sortedSegments = [...segments].sort((a, b) => b.avgValue - a.avgValue);
    const maxValue = Math.max(...segments.map(s => s.avgValue));

    return (
        <TooltipProvider>
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={className}
            >
                <Card className="shadow-soft">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-primary" />
                            Segment Comparison Matrix
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Compare key characteristics across all {segments.length} identified customer segments
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {sortedSegments.map((segment, index) => {
                                const risk = riskConfig[segment.riskLevel];
                                const valuePercent = (segment.avgValue / maxValue) * 100;

                                return (
                                    <motion.div
                                        key={segment.name}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + index * 0.06, duration: 0.4 }}
                                        className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors duration-300"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <h4 className="text-base font-semibold text-foreground">
                                                            {segment.name}
                                                        </h4>
                                                        {index === 0 && (
                                                            <Badge className="gradient-warning text-warning-foreground text-xs">
                                                                <Star className="h-2.5 w-2.5 mr-1" />
                                                                Highest Value
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{segment.keyTrait}</p>
                                                </div>
                                                <Badge variant="outline" className={cn("text-xs", risk.color, risk.bg, "border-current/20")}>
                                                    {risk.label}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="space-y-1.5 cursor-help">
                                                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                                <Users className="h-3 w-3" />
                                                                <span>Segment Size</span>
                                                            </div>
                                                            <div className="font-bold text-lg text-foreground tabular-nums">
                                                                {segment.size.toLocaleString()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {segment.sizePercent.toFixed(1)}% of total
                                                            </div>
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${segment.sizePercent}%` }}
                                                                    transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
                                                                    className="h-full bg-primary/70 rounded-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Number of customers in this segment</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="space-y-1.5 cursor-help">
                                                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                                <DollarSign className="h-3 w-3" />
                                                                <span>Avg Customer Value</span>
                                                            </div>
                                                            <div className="font-bold text-lg text-foreground tabular-nums">
                                                                ${segment.avgValue.toLocaleString()}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {((segment.avgValue / maxValue) * 100).toFixed(0)}% of top segment
                                                            </div>
                                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${valuePercent}%` }}
                                                                    transition={{ duration: 0.6, delay: 0.25 + index * 0.05 }}
                                                                    className={cn(
                                                                        "h-full rounded-full",
                                                                        valuePercent > 80 ? "bg-success" :
                                                                            valuePercent > 50 ? "bg-warning" : "bg-warning/70"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Average revenue per customer in this segment</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                                        <Lightbulb className="h-3 w-3" />
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

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-5 p-4 rounded-xl bg-muted/40 border border-border/40"
                        >
                            <div className="flex items-start gap-3">
                                <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                                <div>
                                    <h5 className="font-semibold text-sm mb-1">Segment Strategy Recommendation</h5>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        Focus retention efforts on high-value segments while developing targeted
                                        acquisition strategies for under-represented profitable segments.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </TooltipProvider>
    );
}
