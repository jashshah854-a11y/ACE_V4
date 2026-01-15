import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureImportance } from "@/types/reportTypes";
import { cn } from "@/lib/utils";
import { BrainCircuit, Target, TrendingUp, AlertCircle } from "lucide-react";

interface PredictiveDriversChartProps {
    data: FeatureImportance;
}

export function PredictiveDriversChart({ data }: PredictiveDriversChartProps) {
    if (!data?.available || !data.feature_importance) return null;

    const { target, task_type, feature_importance, insights } = data;

    // Sort and limit to top 10
    const sortedFeatures = [...feature_importance]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 10);

    const maxImportance = sortedFeatures.length > 0 ? sortedFeatures[0].importance : 1;

    return (
        <Card className="border-border/50 shadow-sm bg-gradient-to-br from-background to-slate-50/50 dark:to-slate-950/30">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                            <BrainCircuit className="w-5 h-5 text-indigo-500" />
                            Predictive Drivers
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>What factors influence</span>
                            <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
                                {target || "Outcome"}
                            </Badge>
                            <span>?</span>
                        </div>
                    </div>
                    {task_type && (
                        <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
                            {task_type} Model
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">

                {/* Insight Box */}
                {insights && insights.length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-900 flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                        <p>{insights[0]}</p>
                    </div>
                )}

                {/* Feature List */}
                <div className="space-y-4">
                    {sortedFeatures.map((feat, idx) => (
                        <div key={idx} className="group cursor-default">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                                    {feat.feature}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {(feat.importance * 100).toFixed(1)}% influence
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full relative overflow-hidden group-hover:bg-indigo-600 transition-colors duration-500"
                                    style={{ width: `${(feat.importance / maxImportance) * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <AlertCircle className="w-3 h-3" />
                    <span>Derived from white-box interpretable models (Regression/Random Forest).</span>
                </div>

            </CardContent>
        </Card>
    );
}
