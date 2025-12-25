import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, Target } from "lucide-react";
import { motion } from "framer-motion";

interface ModelUseGuidelinesProps {
    target: string;
    r2: number;
    className?: string;
}

export function ModelUseGuidelines({ target, r2, className }: ModelUseGuidelinesProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={className}
        >
            <Card className="border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                        <AlertTriangle className="h-5 w-5" />
                        Outcome Model: Not Suitable for Production Use
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Attempting to predict:
                            </p>
                            <code className="text-base font-mono bg-muted px-2 py-1 rounded">
                                {target}
                            </code>
                        </div>

                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Why this model failed:</strong> The R² score of {r2.toFixed(3)} indicates
                                the model cannot learn a predictive signal from the current features.
                                Predictions would be no better than guessing the average value.
                            </AlertDescription>
                        </Alert>

                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-start gap-2">
                                <Target className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">What's needed to fix this:</h4>
                                    <ul className="space-y-1.5 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>
                                            <span><strong>Better target variable:</strong> The outcome you're trying to predict may not be suitable or may have insufficient variance</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>
                                            <span><strong>More relevant features:</strong> Current data columns don't contain strong predictive signals</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>
                                            <span><strong>More data:</strong> Additional records with diverse patterns may help the model learn</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-1">•</span>
                                            <span><strong>Feature engineering:</strong> Create derived metrics like ratios, trends, or interaction terms</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">
                                        Safe use cases right now:
                                    </h4>
                                    <ul className="space-y-1 text-sm text-green-900 dark:text-green-100">
                                        <li>• Exploratory analysis to understand which features matter most</li>
                                        <li>• Hypothesis generation for future modeling efforts</li>
                                        <li>• Identifying data quality issues that block prediction</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-sm text-red-900 dark:text-red-100 mb-2">
                                        Do NOT use for:
                                    </h4>
                                    <ul className="space-y-1 text-sm text-red-900 dark:text-red-100">
                                        <li>• Making any automated decisions</li>
                                        <li>• Forecasting revenue or customer behavior</li>
                                        <li>• Production systems or real-time predictions</li>
                                        <li>• Reporting predicted values as insights</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <h4 className="font-semibold text-sm mb-2">Analytics Team Task List:</h4>
                            <ol className="space-y-2 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="font-mono text-muted-foreground">1.</span>
                                    <span>Meet with domain experts to validate if <code className="bg-muted px-1 rounded text-xs">{target}</code> is the right outcome to predict</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-mono text-muted-foreground">2.</span>
                                    <span>Identify additional data sources that might contain predictive features</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-mono text-muted-foreground">3.</span>
                                    <span>Perform feature engineering: create time-based trends, categorical aggregations, and interaction terms</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-mono text-muted-foreground">4.</span>
                                    <span>Re-run analysis with improved dataset and validate on hold-out test set</span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
