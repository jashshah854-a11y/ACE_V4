
import React from "react";
import { useSimulation } from "@/context/SimulationContext";
import { AnalystResponseCard } from "./AnalystResponseCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed } from "lucide-react";

export function QueryRail() {
    const { queryThreads } = useSimulation();

    if (queryThreads.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <MessageSquareDashed className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Analyst Core Ready
                </h3>
                <p className="text-sm max-w-[200px]">
                    Right-click any data point (chart, table row, or text) to ask a question.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-mono text-sm font-bold text-slate-500 uppercase tracking-widest">
                    Query Thread ({queryThreads.length})
                </h3>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-20">
                    {queryThreads.map((thread) => (
                        <AnalystResponseCard key={thread.id} thread={thread} />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
