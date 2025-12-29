import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Circle, CheckCircle } from "lucide-react";

interface NavigationSection {
    id: string;
    title: string;
    completed?: boolean;
}

interface NavigationRailProps {
    sections: NavigationSection[];
    activeSection: string;
    onSectionClick: (sectionId: string) => void;
    className?: string;
}

export function NavigationRail({
    sections,
    activeSection,
    onSectionClick,
    className,
}: NavigationRailProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleSectionClick = (sectionId: string) => {
        onSectionClick(sectionId);

        // Smooth scroll to section
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    return (
        <aside
            className={cn(
                "border-r border-[hsl(var(--library-muted))]/20 bg-[hsl(var(--library-bg))] transition-all duration-300 relative",
                isCollapsed ? "w-12" : "w-64",
                className
            )}
        >
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute top-4 -right-3 z-10 w-6 h-6 rounded-full bg-[hsl(var(--library-bg))] border border-[hsl(var(--library-muted))]/20 flex items-center justify-center hover:bg-[hsl(var(--library-accent))]/10 transition-colors"
                aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
                {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-[hsl(var(--library-muted))]" />
                ) : (
                    <ChevronLeft className="w-3 h-3 text-[hsl(var(--library-muted))]" />
                )}
            </button>

            {!isCollapsed && (
                <>
                    {/* Header */}
                    <div className="p-6 border-b border-[hsl(var(--library-muted))]/20">
                        <h2 className="font-[family-name:var(--font-library-heading)] text-xl text-[hsl(var(--library-text))]">
                            Contents
                        </h2>
                    </div>

                    {/* Table of Contents */}
                    <nav className="p-4">
                        <ul className="space-y-1">
                            {sections.map((section) => {
                                const isActive = activeSection === section.id;
                                const isCompleted = section.completed;

                                return (
                                    <li key={section.id}>
                                        <button
                                            onClick={() => handleSectionClick(section.id)}
                                            className={cn(
                                                "w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2",
                                                "font-[family-name:var(--font-library-body)] text-sm",
                                                isActive
                                                    ? "bg-[hsl(var(--lab-signal))]/10 text-[hsl(var(--library-text))] font-medium"
                                                    : "text-[hsl(var(--library-muted))] hover:bg-[hsl(var(--library-accent))]/5"
                                            )}
                                        >
                                            {/* Progress Indicator */}
                                            <div className="flex-shrink-0">
                                                {isCompleted ? (
                                                    <CheckCircle className="w-4 h-4 text-[hsl(var(--lab-signal))]" />
                                                ) : isActive ? (
                                                    <Circle className="w-4 h-4 text-[hsl(var(--lab-signal))] fill-[hsl(var(--lab-signal))]" />
                                                ) : (
                                                    <Circle className="w-4 h-4 text-[hsl(var(--library-muted))]/30" />
                                                )}
                                            </div>

                                            {/* Section Title */}
                                            <span className="flex-1">{section.title}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </>
            )}

            {/* Collapsed State - Vertical Text */}
            {isCollapsed && (
                <div className="flex items-center justify-center h-full">
                    <span
                        className="font-[family-name:var(--font-library-body)] text-xs text-[hsl(var(--library-muted))] uppercase tracking-wider"
                        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                    >
                        Contents
                    </span>
                </div>
            )}
        </aside>
    );
}
