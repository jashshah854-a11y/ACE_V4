import { HelpCircle, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WhyExplainerProps {
    reasons: string[];
    title?: string;
    className?: string;
}

export function WhyExplainer({ reasons, title = "Why are these insights suppressed?", className }: WhyExplainerProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!reasons || reasons.length === 0) return null;

    return (
        <div className={cn("rounded-lg border bg-muted/40", className)}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-4 text-left"
            >
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-500">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{title}</span>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isOpen && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                    <ul className="space-y-2">
                        {reasons.map((reason, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground bg-background p-2 rounded border">
                                {reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
