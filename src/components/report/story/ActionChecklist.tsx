import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ActionChecklistProps {
    title: string;
    items: string[];
}

export function ActionChecklist({ title, items }: ActionChecklistProps) {
    // Local state to track checked items (visual play only, not persisted yet)
    const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});

    const toggleItem = (idx: number) => {
        setCheckedState(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    // Heuristic: Extract list items from markdown content if passed as a single string
    // But for now, we assume the parent passes structured items or we parse basic markdown bullets

    return (
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-sans font-bold text-foreground mb-6 flex items-center gap-2">
                <span className="bg-teal-500 text-white w-6 h-6 rounded flex items-center justify-center text-xs">✓</span>
                Recommended Actions
            </h3>

            <div className="space-y-4">
                {items.map((item, idx) => {
                    const isChecked = checkedState[idx];

                    return (
                        <div
                            key={idx}
                            onClick={() => toggleItem(idx)}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer group select-none",
                                isChecked
                                    ? "bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800"
                                    : "bg-background border-transparent hover:border-border hover:bg-muted/30"
                            )}
                        >
                            <div className={cn(
                                "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                isChecked
                                    ? "bg-teal-500 border-teal-500 text-white"
                                    : "border-muted-foreground/30 group-hover:border-teal-500/50"
                            )}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div className={cn(
                                "flex-1 text-base md:text-lg transition-opacity",
                                isChecked ? "opacity-50 line-through text-muted-foreground" : "text-foreground"
                            )}>
                                {/* Render item content (handles basic text) */}
                                <ReactMarkdown components={{ p: ({ children }) => <span className="font-serif">{children}</span> }}>
                                    {item}
                                </ReactMarkdown>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
