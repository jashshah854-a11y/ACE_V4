import { Button } from "@/components/ui/button";
import { ScrollText, Database, ChevronRight } from "lucide-react";
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
        <div className={cn("flex flex-col h-full py-6 pr-4 border-r bg-slate-50/50 dark:bg-slate-900/20", className)}>
            <div className="mb-6 px-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest text opacity-70">
                    Contents
                </h3>
            </div>

            <nav className="flex-1 space-y-2 px-2 overflow-y-auto">
                {items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={cn(
                                "group w-full text-left text-sm px-4 py-2.5 rounded-md transition-all duration-200 flex items-center justify-between",
                                isActive
                                    ? "bg-navy-50 text-navy-900 font-semibold shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <span className="truncate">{item.label}</span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                        </button>
                    )
                })}
            </nav>
        </div>
    );
}

