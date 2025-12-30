
import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";

interface TruthCheckProps {
    targetId: string;
    targetType: 'insight' | 'query_response';
    className?: string;
}

export function TruthCheck({ targetId, targetType, className }: TruthCheckProps) {
    const { submitFeedback } = useSimulation();
    const [status, setStatus] = useState<'idle' | 'positive' | 'negative'>('idle');

    const handleRate = (rating: 'positive' | 'negative') => {
        setStatus(rating);
        submitFeedback({
            target_id: targetId,
            target_type: targetType,
            rating,
        });
    };

    if (status !== 'idle') {
        return (
            <div className={cn("flex items-center gap-2 text-xs font-medium animate-in fade-in zoom-in duration-300",
                status === 'positive' ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
                className
            )}>
                <Check className="w-3 h-3" />
                <span>Feedback recorded</span>
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={() => handleRate('positive')}
                title="Valid Insight"
            >
                <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => handleRate('negative')}
                title="Report Issue"
            >
                <ThumbsDown className="w-3 h-3" />
            </Button>
        </div>
    );
}
