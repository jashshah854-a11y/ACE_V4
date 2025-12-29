import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EvidenceCardProps {
    title: string;
    children: ReactNode;
    citation?: string;
    className?: string;
}

export function EvidenceCard({ title, children, citation, className }: EvidenceCardProps) {
    return (
        <div
            className={cn(
                "bg-[hsl(var(--lab-charcoal))] border border-[hsl(var(--lab-border))] rounded-lg overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[hsl(var(--lab-border))]">
                <h3 className="text-[hsl(var(--lab-signal))] font-[family-name:var(--font-lab)] text-sm font-medium">
                    {title}
                </h3>
            </div>

            {/* Content */}
            <div className="p-4">
                <div className="text-[hsl(var(--lab-silver))] font-[family-name:var(--font-lab)] text-sm">
                    {children}
                </div>
            </div>

            {/* Citation Footer */}
            {citation && (
                <div className="px-4 py-2 bg-[hsl(var(--lab-charcoal))] border-t border-[hsl(var(--lab-border))]">
                    <p className="text-[hsl(var(--lab-silver))]/60 font-[family-name:var(--font-lab)] text-xs">
                        Source: {citation}
                    </p>
                </div>
            )}
        </div>
    );
}
