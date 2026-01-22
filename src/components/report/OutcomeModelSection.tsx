import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressRing } from "./ProgressRing";
import { OutcomeModelData } from "@/lib/reportParser";
import { numberFormatter } from "@/lib/numberFormatter";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ModelUseGuidelines } from "./ModelUseGuidelines";
import { ScopePlaceholder } from "./ScopePlaceholder";
import type { AnalysisIntent, ScopeConstraint, TargetCandidate } from "@/types/analysisIntent";

interface OutcomeModelSectionProps {
    data: OutcomeModelData | null;
    scopeConstraints?: ScopeConstraint[];
    analysisIntent?: AnalysisIntent;
    targetCandidate?: TargetCandidate;
}

export function OutcomeModelSection({ data, scopeConstraints = [], analysisIntent, targetCandidate }: OutcomeModelSectionProps) {
    if (!data || data.status === 'skipped') {
        return (
            <ScopePlaceholder
                sectionName="Outcome Modeling"
                agentKey="regression"
                scopeConstraints={scopeConstraints}
                analysisIntent={analysisIntent}
                targetCandidate={targetCandidate}
            />
        );
    }

    const r2 = data.r2 || 0;
    const isGood = r2 > 0.7;
    const isFair = r2 > 0.3 && r2 <= 0.7;
    const isPoor = r2 <= 0.3;

    if (isPoor) {
        return <ModelUseGuidelines target={data.target} r2={r2} />;
    }

    // Convert R² to percentage for gauge (max 100, min 0)
    const r2Percent = Math.max(0, Math.min(100, r2 * 100));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <Card className={cn(
                "border-2",
                isPoor && "border-red-200 bg-red-50/30 dark:bg-red-950/10",
                isFair && "border-yellow-200 bg-yellow-50/30 dark:bg-yellow-950/10",
                isGood && "border-green-200 bg-green-50/30 dark:bg-green-950/10"
            )}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {isPoor && <XCircle className="h-5 w-5 text-red-600" />}
                        {isFair && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                        {isGood && <CheckCircle className="h-5 w-5 text-green-600" />}
                        <span>
                            Model Performance: {isPoor ? 'Poor' : isFair ? 'Fair' : 'Good'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Target */}
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">
                            Predicting:
                        </p>
                        <code className="text-base font-mono bg-muted px-2 py-1 rounded">
                            {data.target}
                        </code>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* R² Gauge */}
                        <div className="flex flex-col items-center">
                            <ProgressRing
                                value={r2Percent}
                                size={120}
                                showValue={false}
                                color={isPoor ? 'red' : isFair ? 'amber' : 'green'}
                            />
                            <div className="text-center mt-3">
                                <div className="text-2xl font-bold">
                                    R² = {numberFormatter.decimal(r2, 2)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {r2Percent.toFixed(0)}% of variance explained
                                </p>
                            </div>
                        </div>

                        {/* Error Metrics */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Error Metrics</h4>
                                <div className="space-y-2">
                                    {data.rmse && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">RMSE:</span>
                                            <span className="font-mono text-sm">
                                                {numberFormatter.compact(data.rmse)}
                                            </span>
                                        </div>
                                    )}
                                    {data.mae && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">MAE:</span>
                                            <span className="font-mono text-sm">
                                                {numberFormatter.compact(data.mae)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Top Drivers */}
                            {!isPoor && data.drivers && data.drivers.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Top Predictors</h4>
                                    <div className="space-y-1">
                                        {(Array.isArray(data.drivers) ? data.drivers : []).slice(0, 3).map((driver, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="truncate">{driver.feature}</span>
                                                <span className="text-muted-foreground ml-2">
                                                    {numberFormatter.percentageValue(driver.importance * 100, 0)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {isFair && (
                        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                                Moderate predictive power. The model captures some patterns but has room for improvement.
                            </AlertDescription>
                        </Alert>
                    )}

                    {isGood && (
                        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-900 dark:text-green-100">
                                Strong predictive model! The features reliably predict the outcome.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
