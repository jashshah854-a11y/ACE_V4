import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportanceReport } from "@/types/reportTypes";
import { BrainCircuit, TrendingUp, AlertCircle } from "lucide-react";
import { isValidArtifact } from "@/lib/artifactGuard";

interface PredictiveDriversChartProps {
    data: ImportanceReport;
}

export function PredictiveDriversChart({ data }: PredictiveDriversChartProps) {
    if (!data || !isValidArtifact(data) || !data.features) return null;

    const { target_column, method, features } = data;

    const sortedFeatures = [...features]
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
                                {target_column || "Outcome"}
                            </Badge>
                            <span>?</span>
                        </div>
                    </div>
                    {method && (
                        <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">
                            {method.replace(/_/g, " ")}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-900 flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                    <p>Importance normalized to a 0-100 scale using permutation importance.</p>
                </div>

                <div className="space-y-4">
                    {sortedFeatures.map((feat, idx) => (
                        <div key={idx} className="group cursor-default">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                                <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                                    {feat.feature}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                    {feat.importance.toFixed(1)} / 100
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

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <AlertCircle className="w-3 h-3" />
                    <span>Drivers derived from holdout permutation importance.</span>
                </div>
            </CardContent>
        </Card>
    );
}
