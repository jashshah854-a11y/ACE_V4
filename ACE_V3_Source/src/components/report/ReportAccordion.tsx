import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export const SECTION_ICONS = {
    summary: "📊",
    anomalies: "⚠️",
    quality: "✅",
    insights: "💡",
    segments: "👥",
    default: "•",
};

interface AccordionSection {
    id: string;
    title: string;
    content: React.ReactNode;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
}

interface ReportAccordionProps {
    sections?: AccordionSection[];
    className?: string;
}

/**
 * Minimal accordion to host report sections.
 * Defensive to avoid runtime "undefined" errors when sections are absent.
 */
export function ReportAccordion({ sections = [], className }: ReportAccordionProps) {
    if (!sections || sections.length === 0) return null;

    return (
        <div className={cn("space-y-2", className)}>
            {sections.map((section) => (
                <AccordionItem key={section.id} section={section} />
            ))}
        </div>
    );
}

function AccordionItem({ section }: { section: AccordionSection }) {
    const [open, setOpen] = useState(Boolean(section.defaultOpen));
    const icon =
        section.icon ??
        SECTION_ICONS[(section.title?.toLowerCase() as keyof typeof SECTION_ICONS) ?? "default"] ??
        SECTION_ICONS.default;

    return (
        <div className="border rounded-md">
            <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 text-left"
                onClick={() => setOpen((v) => !v)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{icon}</span>
                    <span className="font-semibold text-sm">{section.title}</span>
                </div>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        open && "rotate-180"
                    )}
                />
            </button>
            {open && (
                <div className="px-3 pb-3 pt-1 text-sm space-y-2">
                    {section.content}
                </div>
            )}
        </div>
    );
}

