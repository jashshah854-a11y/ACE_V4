/**
 * GhostTab Component
 * 
 * Disabled tab component with lock icon for suppressed features.
 * Clicking the tab triggers the GuidanceModal to explain why it's locked.
 */

import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GhostTabProps {
    label: string;
    onClick: () => void;
    className?: string;
}

export function GhostTab({ label, onClick, className }: GhostTabProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                            "text-muted-foreground bg-muted/30 cursor-not-allowed opacity-60",
                            "hover:opacity-80 hover:bg-muted/50 transition-all duration-200",
                            "border border-dashed border-muted-foreground/30",
                            className
                        )}
                    >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{label}</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">
                        This feature is currently locked due to data quality issues.
                        Click to learn how to unlock it.
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
