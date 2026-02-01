import { useState } from "react";
import { TableOfContents, TOCItem } from "./TableOfContents";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

interface MobileTocDrawerProps {
    items: TOCItem[];
    className?: string;
}

/**
 * Mobile-friendly TOC drawer that appears as a floating button on small screens.
 * Opens a slide-out drawer with the full TableOfContents navigation.
 */
export function MobileTocDrawer({ items, className }: MobileTocDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!items.length) return null;

    return (
        <>
            {/* Floating Toggle Button - visible only on small screens */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 xl:hidden",
                    "flex items-center justify-center w-12 h-12 rounded-full",
                    "bg-primary text-primary-foreground shadow-lg",
                    "hover:bg-primary/90 transition-colors",
                    className
                )}
                aria-label="Open table of contents"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm xl:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer Panel */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-xl",
                    "transform transition-transform duration-300 ease-in-out xl:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold text-sm">Navigation</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        aria-label="Close navigation"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[calc(100vh-60px)]">
                    <TableOfContents
                        items={items}
                        className="border-none pr-0"
                    />
                </div>
            </div>
        </>
    );
}
