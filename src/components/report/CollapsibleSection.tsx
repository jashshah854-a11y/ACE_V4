import { ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    children: ReactNode;
}

/**
 * Collapsible Section Component
 * 
 * Progressive disclosure wrapper for Executive mode.
 * Allows hiding technical details while keeping them accessible.
 */
export function CollapsibleSection({
    title,
    subtitle,
    defaultOpen = false,
    children,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
            >
                <div>
                    <span className="font-semibold text-sm">{title}</span>
                    {subtitle && (
                        <span className="text-xs text-muted-foreground ml-2">
                            ({subtitle})
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {isOpen && (
                <div className="p-6 space-y-8 border-t border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
}
