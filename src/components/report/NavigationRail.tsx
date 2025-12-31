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
                    Report Sections
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
                                "group w-full text-left text-sm px-4 py-3 rounded-r-lg border-l-4 transition-all duration-200 flex items-center justify-between",
                                isActive
                                    ? "bg-white dark:bg-slate-800 border-teal-500 text-teal-700 dark:text-teal-400 font-semibold shadow-sm"
                                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/50 dark:hover:text-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50")}>
                                    {isActive ? <div className="w-1.5 h-1.5 rounded-full bg-teal-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                                </span>
                                <span className="truncate">{item.label}</span>
                            </div>
                            {isActive && <ChevronRight className="h-4 w-4 text-teal-500 opacity-50" />}
                        </button>
                    )
                })}
            </nav>

            <div className="mt-auto pt-6 px-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground border-dashed"
                    onClick={() => console.log("Dataset Identity Triggered")}
                >
                    <Database className="h-4 w-4" />
                    <span className="text-xs">View Source Data</span>
                </Button>
            </div>
        </div>
    );
}

