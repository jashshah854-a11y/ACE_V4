import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
    label: string;
    value: number; // 0-100
    className?: string;
}

export function ProgressIndicator({ label, value, className }: ProgressIndicatorProps) {
    const percentage = Math.min(100, Math.max(0, value));
    const color = getColorClass(percentage);

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className={cn("h-2", color)} />
        </div>
    );
}

function getColorClass(percentage: number): string {
    if (percentage >= 90) return "[&>div]:bg-green-500";
    if (percentage >= 70) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
}

interface ProgressIndicatorsProps {
    completeness?: number;
    validRecords?: number;
    className?: string;
}

export function ProgressIndicators({
    completeness,
    validRecords,
    className
}: ProgressIndicatorsProps) {
    const indicators = [
        { label: "Completeness", value: completeness },
        { label: "Valid Records", value: validRecords },
    ].filter(indicator => indicator.value !== undefined && indicator.value !== null);

    if (indicators.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-4", className)}>
            {indicators.map((indicator, index) => (
                <ProgressIndicator
                    key={index}
                    label={indicator.label}
                    value={indicator.value!}
                />
            ))}
        </div>
    );
}
