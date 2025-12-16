import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection } from "@/lib/reportParser";

interface TOCItem {
    id: string;
    title: string;
    level: number;
    children?: TOCItem[];
}

interface TableOfContentsProps {
    sections: ReportSection[];
    className?: string;
}

/**
 * Sticky table of contents with auto-scroll highlighting
 * Uses Intersection Observer to track active section
 */
export function TableOfContents({ sections, className }: TableOfContentsProps) {
    const [activeSection, setActiveSection] = useState<string>("");
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        // Create Intersection Observer to track visible sections
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            {
                rootMargin: "-20% 0px -80% 0px", // Trigger when section is in top 20% of viewport
                threshold: 0.1,
            }
        );

        // Observe all section headers
        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element && observerRef.current) {
                observerRef.current.observe(element);
            }
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [sections]);

    const handleSectionClick = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // Build hierarchical structure from flat sections list
    const buildTOCTree = (sections: ReportSection[]): TOCItem[] => {
        const tree: TOCItem[] = [];
        const level1Items: Map<string, TOCItem> = new Map();

        sections.forEach((section) => {
            const item: TOCItem = {
                id: section.id,
                title: section.title,
                level: section.level,
            };

            if (section.level === 1) {
                // Top level (h2)
                tree.push(item);
                level1Items.set(section.id, item);
            } else if (section.level === 2) {
                // Sub-level (h3) - add to last top level item
                const lastTopLevel = tree[tree.length - 1];
                if (lastTopLevel) {
                    if (!lastTopLevel.children) {
                        lastTopLevel.children = [];
                    }
                    lastTopLevel.children.push(item);
                }
            }
        });

        return tree;
    };

    const tocTree = buildTOCTree(sections);

    if (sections.length === 0) return null;

    return (
        <Card className={cn("sticky top-24", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Table of Contents
                </CardTitle>
            </CardHeader>
            <CardContent>
                <nav className="space-y-1">
                    {tocTree.map((item) => (
                        <div key={item.id}>
                            {/* Top Level Item */}
                            <button
                                onClick={() => handleSectionClick(item.id)}
                                className={cn(
                                    "w-full text-left text-sm px-2 py-1.5 rounded transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    activeSection === item.id && "bg-primary/10 text-primary font-medium"
                                )}
                            >
                                {item.title}
                            </button>

                            {/* Children */}
                            {item.children && item.children.length > 0 && (
                                <div className="ml-4 mt-1 space-y-1">
                                    {item.children.map((child) => (
                                        <button
                                            key={child.id}
                                            onClick={() => handleSectionClick(child.id)}
                                            className={cn(
                                                "w-full text-left text-xs px-2 py-1 rounded transition-colors flex items-center gap-1",
                                                "hover:bg-accent/50 hover:text-accent-foreground",
                                                activeSection === child.id && "bg-primary/5 text-primary"
                                            )}
                                        >
                                            <ChevronRight className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{child.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </CardContent>
        </Card>
    );
}
