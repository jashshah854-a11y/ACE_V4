import React from "react";
import { cn } from "../../lib/utils";

interface TocSection {
    id?: string;
    title: string;
    content?: string;
}

interface TableOfContentsProps {
    sections?: TocSection[];
    className?: string;
}

/**
 * Lightweight Table of Contents for report sections.
 * Keeps rendering safe even if section metadata is missing.
 */
export function TableOfContents({ sections = [], className }: TableOfContentsProps) {
    if (!sections || sections.length === 0) {
        return null;
    }

    return (
        <div className={cn("border rounded-md p-3 bg-muted/30", className)}>
            <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">
                Table of Contents
            </div>
            <ol className="space-y-1 text-sm">
                {sections.map((section, idx) => (
                    <li key={section.id ?? idx} className="flex items-start gap-2">
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        <span className="leading-snug">{section.title || "Untitled section"}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

