import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface SafeModeWrapperProps {
    isLowConfidence: boolean;
    confidenceScore?: number;
    children: ReactNode;
    className?: string;
}

export function SafeModeWrapper({
    isLowConfidence,
    confidenceScore,
    children,
    className,
}: SafeModeWrapperProps) {
    if (!isLowConfidence) {
        return <>{children}</>;
    }

    return (
        <div className={cn("relative", className)}>
            {/* Safe Mode Banner */}
            <div className="sticky top-0 z-50 bg-[hsl(var(--lab-alert))]/10 border-b border-[hsl(var(--lab-alert))]/30 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-[hsl(var(--lab-alert))] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-[family-name:var(--font-library-heading)] text-lg text-[hsl(var(--library-text))] mb-1">
                            Safe Mode Active
                        </h3>
                        <p className="font-[family-name:var(--font-library-body)] text-sm text-[hsl(var(--library-muted))]">
                            Confidence is low
                            {confidenceScore !== undefined && ` (${Math.round(confidenceScore * 100)}%)`}.
                            Showing descriptive view only. Predictive features have been disabled.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filtered Content */}
            <div className="opacity-90">
                {children}
            </div>
        </div>
    );
}

// Helper to determine if Safe Mode should be active
export function shouldActivateSafeMode(
    overallConfidence?: number,
    validationStatus?: string
): boolean {
    if (overallConfidence !== undefined && overallConfidence < 0.3) {
        return true;
    }
    if (validationStatus === "failed" || validationStatus === "blocked") {
        return true;
    }
    return false;
}
