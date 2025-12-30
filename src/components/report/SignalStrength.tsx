import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SignalStrengthProps {
    strength: "high" | "moderate" | "low";
    score: number;
    className?: string;
}

export function SignalStrength({ strength, score, className }: SignalStrengthProps) {
    // Determine bar colors and active count based on strength
    const bars = [1, 2, 3];

    const getBarColor = (index: number) => {
        // Active bars
        const isActive =
            (strength === "high" && index <= 3) ||
            (strength === "moderate" && index <= 2) ||
            (strength === "low" && index <= 1);

        if (!isActive) return "bg-muted";

        if (strength === "high") return "bg-emerald-500";
        if (strength === "moderate") return "bg-amber-500";
        return "bg-rose-500";
    };

    const label =
        strength === "high" ? "Strong Signal" :
            strength === "moderate" ? "Moderate Signal" : "Weak Signal";

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-2 cursor-help select-none", className)}>
                        <div className="flex items-end gap-0.5 h-4">
                            {bars.map((bar) => (
                                <div
                                    key={bar}
                                    className={cn(
                                        "w-1.5 rounded-sm transition-colors",
                                        getBarColor(bar),
                                        bar === 1 ? "h-2" : bar === 2 ? "h-3" : "h-4"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="text-xs font-medium text-muted-foreground">
                            {score}%
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    <p className="font-semibold">{label}</p>
                    <p className="text-muted-foreground">Confidence Score: {score}/100</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
