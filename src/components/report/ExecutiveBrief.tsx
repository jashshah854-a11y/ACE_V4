import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExecutiveBriefProps {
    purpose: string;
    keyFindings: string[];
    confidenceVerdict: string;
    recommendedAction: string;
    className?: string;
}

/**
 * ExecutiveBrief - Consultant-style report summary
 * 
 * Replaces technical metrics at top with narrative that answers:
 * - What was analyzed
 * - What was found
 * - What to do next
 * 
 * Designed for non-technical stakeholders to quickly grasp insights
 */
export function ExecutiveBrief({
    purpose,
    keyFindings,
    confidenceVerdict,
    recommendedAction,
    className,
}: ExecutiveBriefProps) {
    // Determine confidence level for styling
    const isHighConfidence = confidenceVerdict.toLowerCase().includes("high");
    const isLowConfidence = confidenceVerdict.toLowerCase().includes("low") ||
        confidenceVerdict.toLowerCase().includes("insufficient");

    return (
        <Card className={cn("border-2 border-primary/20 bg-gradient-to-br from-background to-muted/20", className)}>
            <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                    <Target className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Executive Summary</h2>
                        <p className="text-base text-muted-foreground leading-relaxed">
                            {purpose}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Key Findings */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Key Findings</h3>
                    </div>
                    <ul className="space-y-2">
                        {keyFindings.map((finding, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-medium">
                                    {index + 1}
                                </span>
                                <span className="text-base leading-relaxed pt-0.5">{finding}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Confidence Verdict */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        {isHighConfidence ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : isLowConfidence ? (
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-blue-600" />
                        )}
                        <h3 className="font-semibold text-lg">Analysis Confidence</h3>
                    </div>
                    <p
                        className={cn(
                            "text-base px-4 py-3 rounded-md border-l-4",
                            isHighConfidence && "bg-green-50 dark:bg-green-950/20 border-green-600 text-green-900 dark:text-green-100",
                            isLowConfidence && "bg-amber-50 dark:bg-amber-950/20 border-amber-600 text-amber-900 dark:text-amber-100",
                            !isHighConfidence && !isLowConfidence && "bg-blue-50 dark:bg-blue-950/20 border-blue-600 text-blue-900 dark:text-blue-100"
                        )}
                    >
                        {confidenceVerdict}
                    </p>
                </div>

                {/* Recommended Action */}
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">              <span className="text-lg">➡️</span>
                        </div>
                        <h3 className="font-semibold text-lg">Recommended Next Step</h3>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-md p-4">
                        <p className="text-base font-medium leading-relaxed text-foreground">
                            {recommendedAction}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
