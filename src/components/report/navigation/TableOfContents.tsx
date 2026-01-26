import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface TOCItem {
    id: string;
    label: string;
}

interface TableOfContentsProps {
    items: TOCItem[];
    className?: string;
}

export function TableOfContents({ items, className }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>("");
    const [renderedItems, setRenderedItems] = useState<TOCItem[]>([]);

    useEffect(() => {
        const resolved = items.filter((item) => Boolean(document.getElementById(item.id)));
        setRenderedItems(resolved);
    }, [items]);

    useEffect(() => {
        if (!renderedItems.length) {
            return;
        }
        if (typeof IntersectionObserver === "undefined") {
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                rootMargin: "-20% 0px -35% 0px",
                threshold: 0,
            }
        );

        renderedItems.forEach((item) => {
            const element = document.getElementById(item.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [renderedItems]);

    const handleScroll = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 100, // Offset for sticky header
                behavior: "smooth",
            });
            setActiveId(id);
        }
    };

    if (!renderedItems.length) return null;

    return (
        <nav className={cn("space-y-1", className)}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
                On this page
            </h4>
            <div className="relative">
                {/* Active Line Indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border ml-0.5" />

                <ul className="space-y-1">
                    {renderedItems.map((item) => {
                        const isActive = activeId === item.id;
                        return (
                            <li key={item.id} className="relative">
                                <a
                                    href={`#${item.id}`}
                                    onClick={(e) => handleScroll(item.id, e)}
                                    className={cn(
                                        "group flex items-center justify-between py-1.5 px-3 text-sm transition-colors border-l-2",
                                        isActive
                                            ? "border-primary text-primary font-medium bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                                    )}
                                >
                                    <span className="truncate">{item.label}</span>
                                    {isActive && (
                                        <ChevronRight className="w-3 h-3 opacity-100 transition-opacity" />
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
}
