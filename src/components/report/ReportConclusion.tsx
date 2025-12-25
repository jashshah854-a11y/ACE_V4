import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

export interface ReportConclusionProps {
    shouldUseFor: string[];
    shouldNotUseFor: string[];
    nextStep: string;
    className?: string;
}

/**
 * ReportConclusion - Decision boundary for report usage
 * 
 * Explicitly states what the analysis IS and IS NOT suitable for,
 * plus one concrete action to take next.
 * 
 * Prevents misuse and sets clear expectations.
 */
export function ReportConclusion({
    shouldUseFor,
    shouldNotUseFor,
    nextStep,
    className,
}: ReportConclusionProps) {
    // Safe defaults
    const safeShouldUseFor = Array.isArray(shouldUseFor) && shouldUseFor.length > 0
        ? shouldUseFor.filter(s => s && typeof s === 'string')
        : ["General business intelligence and trend analysis"];
    const safeShouldNotUseFor = Array.isArray(shouldNotUseFor) && shouldNotUseFor.length > 0
        ? shouldNotUseFor.filter(s => s && typeof s === 'string')
        : ["Making critical decisions without additional validation"];
    const safeNextStep = nextStep || "Review findings with your team and identify areas for deeper analysis";
    return (
        <Card className={className}>
            <CardHeader>
                <h2 className="text-2xl font-bold">How to Use This Analysis</h2>
                <p className="text-muted-foreground">
                    Clear boundaries on appropriate usage and recommended next steps
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Should Use For */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-lg">✅ This Analysis Should Be Used For</h3>
                    </div>
                    <ul className="space-y-2">
                        {safeShouldUseFor.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-base">
                                <span className="text-green-600 mt-0.5">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Should NOT Use For */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <h3 className="font-semibold text-lg">❌ This Analysis Should NOT Be Used For</h3>
                    </div>
                    <ul className="space-y-2">
                        {safeShouldNotUseFor.map((item, index) => (
                            <li key={index} className="flex items-start gap-3 text-base">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Next Step */}
                <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                        <ArrowRight className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">Recommended Next Step</h3>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-600 p-4 rounded-r-md">
                        <p className="text-base font-medium leading-relaxed">
                            {safeNextStep}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
