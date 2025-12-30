import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatasetProfile } from "@/hooks/useDatasetProfile";
import { getFriendlyName, getFocusArea, COLUMN_FOCUS_MAP } from "@/lib/dataTypeMapping";

interface DatasetUnderstandingProps {
    profile: DatasetProfile;
    onProceed: () => void;
    className?: string;
}

/**
 * Dataset Understanding Statement
 * Shows what the system "sees" in the uploaded data
 * Implements the "Dossier" UI with understanding statement and quality check
 */
export function DatasetUnderstanding({ profile, onProceed, className }: DatasetUnderstandingProps) {
    const friendlyName = getFriendlyName(profile.primary_type);
    const focusArea = getFocusArea(profile.key_columns);

    // Determine quality indicator
    const qualityLevel = profile.quality_score >= 0.8 ? "high" : profile.quality_score >= 0.5 ? "moderate" : "low";
    const isLimitationsMode = profile.validation_mode === "limitations" || profile.quality_score < 0.6;

    // Find the primary key column for focus statement
    const primaryKeyColumn = profile.key_columns.find(col => COLUMN_FOCUS_MAP[col]) || profile.key_columns[0];

    return (
        <div className={cn("max-w-3xl mx-auto space-y-6", className)}>
            {/* Understanding Statement */}
            <Card className="p-8 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-2">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                                I am listening to your data...
                            </h3>
                            <p className="text-2xl font-serif text-foreground leading-relaxed">
                                I see <span className="font-bold text-primary">{profile.rows.toLocaleString()}</span> rows of{" "}
                                <span className="font-bold text-primary">{friendlyName}</span> data.
                            </p>
                        </div>

                        {primaryKeyColumn && (
                            <p className="text-lg font-serif text-muted-foreground leading-relaxed">
                                I have detected a <span className="font-semibold text-foreground">{primaryKeyColumn}</span> column,
                                so I will prioritize <span className="font-semibold text-foreground">{focusArea}</span>.
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Quality Traffic Light */}
            <Card className="p-6">
                <h4 className="text-sm font-semibold text-muted-foreground mb-4">Data Quality Check</h4>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {qualityLevel === "high" && (
                            <>
                                <CheckCircle className="h-8 w-8 text-emerald-500" />
                                <div>
                                    <p className="font-semibold text-foreground">Data is dense and ready for modeling</p>
                                    <p className="text-sm text-muted-foreground">Quality Score: {Math.round(profile.quality_score * 100)}%</p>
                                </div>
                            </>
                        )}

                        {qualityLevel === "moderate" && (
                            <>
                                <AlertTriangle className="h-8 w-8 text-amber-500" />
                                <div>
                                    <p className="font-semibold text-foreground">Moderate quality detected</p>
                                    <p className="text-sm text-muted-foreground">
                                        Quality Score: {Math.round(profile.quality_score * 100)}% - Some limitations may apply
                                    </p>
                                </div>
                            </>
                        )}

                        {qualityLevel === "low" && (
                            <>
                                <AlertTriangle className="h-8 w-8 text-rose-500" />
                                <div>
                                    <p className="font-semibold text-foreground">Data is sparse</p>
                                    <p className="text-sm text-muted-foreground">
                                        Quality Score: {Math.round(profile.quality_score * 100)}% - Predictive modeling will be disabled
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    <Badge variant={qualityLevel === "high" ? "default" : qualityLevel === "moderate" ? "secondary" : "destructive"}>
                        {qualityLevel.toUpperCase()}
                    </Badge>
                </div>

                {isLimitationsMode && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                            <div className="text-sm text-amber-900 dark:text-amber-400">
                                <p className="font-medium">Limitations Mode Active</p>
                                <p className="mt-1">
                                    Due to quality constraints, the analysis will focus on descriptive statistics and patterns
                                    rather than predictive modeling. You can proceed, but expect limited forecasting capabilities.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{profile.rows.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Rows</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{profile.columns}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Columns</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{Math.round(profile.quality_score * 100)}%</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Quality</div>
                </Card>
            </div>

            {/* Proceed Button */}
            <div className="flex justify-end pt-4">
                <Button onClick={onProceed} size="lg" className="px-8">
                    Continue to Task Contract →
                </Button>
            </div>
        </div>
    );
}
