import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ReportSection } from "@/lib/reportParser";

interface TableOfContentsProps {
    sections: ReportSection[];
    className?: string;
}

export function TableOfContents({ sections, className }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>("");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: "-20% 0% -35% 0%" }
        );

        // Observe all section headers
        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [sections]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    if (sections.length === 0) {
        return null;
    }

    // Filter to only show h2 and h3 headers
    const tocSections = sections.filter((s) => s.level <= 3);

    return (
        <aside className="sticky top-4 space-y-4 h-fit max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
                <h3 className="font-semibold mb-3 text-sm">Table of Contents</h3>
                <ScrollArea className="h-[calc(100vh-200px)]">
                    <nav className="space-y-1">
                        {tocSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={cn(
                                    "block w-full text-left text-sm py-1.5 px-2 rounded transition-colors",
                                    section.level === 2 && "font-medium",
                                    section.level === 3 && "pl-4 text-muted-foreground",
                                    activeId === section.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                )}
                            >
                                {section.title}
                            </button>
                        ))}
                    </nav>
                </ScrollArea>
            </div>
        </aside>
    );
}
