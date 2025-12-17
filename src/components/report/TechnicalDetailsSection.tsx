import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings } from "lucide-react";
import { MetricsCards } from "./MetricsCards";
import { ReportMetrics } from "@/lib/reportParser";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TechnicalDetailsSectionProps {
    metrics: ReportMetrics;
    runId?: string;
    className?: string;
}

/**
 * TechnicalDetailsSection - Collapsible container for technical metrics
 * 
 * Hides technical jargon (R², RMSE, run IDs) behind a toggle
 * so non-technical users aren't overwhelmed at first glance.
 * 
 * Analysts can expand to see full technical details.
 */
export function TechnicalDetailsSection({
    metrics,
    runId,
    className,
}: TechnicalDetailsSectionProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
            <Card className="border-dashed">
                <CardHeader className="pb-4">
                    <CollapsibleTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-between hover:bg-muted/50 -mx-2 px-2"
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Technical Details
                                </CardTitle>
                                <span className="text-xs text-muted-foreground/70">
                                    (for analysts and data scientists)
                                </span>
                            </div>
                            <ChevronDown
                                className={cn(
                                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                    isOpen && "transform rotate-180"
                                )}
                            />
                        </Button>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                        {/* Metrics Cards */}
                        <MetricsCards metrics={metrics} />

                        {/* Run ID */}
                        {runId && (
                            <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Run ID:</span>{" "}
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                                        {runId}
                                    </code>
                                </p>
                            </div>
                        )}

                        {/* Interpretation Note */}
                        <div className="bg-muted/30 rounded-md p-3 text-xs text-muted-foreground">
                            <p className="font-medium mb-1">📊 Metric Interpretation Guide:</p>
                            <ul className="space-y-1 ml-4 list-disc">
                                <li><strong>Data Quality Score</strong>: Completeness of dataset (higher is better)</li>
                                <li><strong>Confidence Level</strong>: Cluster separation quality (Silhouette Score)</li>
                                <li><strong>R²</strong>: Model fit (0.7+ is strong, 0.3-0.7 is moderate, &lt;0.3 is weak)</li>
                                <li><strong>RMSE/MAE</strong>: Prediction error (lower is better)</li>
                            </ul>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
