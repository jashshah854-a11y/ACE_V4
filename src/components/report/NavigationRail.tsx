import { Button } from "@/components/ui/button";
import { ScrollText, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationItem {
    id: string;
    label: string;
}

interface NavigationRailProps {
    items: NavigationItem[];
    activeSection?: string;
    onNavigate: (id: string) => void;
    className?: string;
}

export function NavigationRail({ items, activeSection, onNavigate, className }: NavigationRailProps) {
    return (
        <div className={cn("flex flex-col h-full py-6 pr-4 border-r", className)}>
            <div className="mb-6 px-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Contents
                </h3>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
                {items.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={cn(
                            "w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-2",
                            "hover:bg-accent hover:text-accent-foreground",
                            activeSection === item.id
                                ? "bg-accent/80 text-foreground font-medium"
                                : "text-muted-foreground"
                        )}
                    >
                        <ScrollText className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto pt-4 border-t">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => console.log("Dataset Identity Triggered")} // Placeholder for modal trigger
                >
                    <Database className="h-4 w-4" />
                    <span className="text-sm">Dataset Identity</span>
                </Button>
            </div>
        </div>
    );
}
