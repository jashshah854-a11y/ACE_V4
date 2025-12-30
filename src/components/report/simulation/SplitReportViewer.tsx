
import React from "react";
import { useSimulation } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, Lock } from "lucide-react";

interface SplitReportViewerProps {
    baselineContent: React.ReactNode;
    simulatedContent?: React.ReactNode; // If undefined, we show a "Simulation Loading" or placeholder
    className?: string;
}

export function SplitReportViewer({ baselineContent, simulatedContent, className }: SplitReportViewerProps) {
    const { simulationState } = useSimulation();

    // If not in comparison mode, just render the baseline (or children directly if we were wrapping)
    // But this component specifically handles the split layout.

    return (
        <div className={cn("grid grid-cols-2 h-[calc(100vh-4rem)] overflow-hidden", className)}>

            {/* LEFT PANE: BASELINE */}
            <div className="border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/30">
                <div className="p-3 border-b flex items-center justify-between bg-white dark:bg-slate-950 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono uppercase tracking-wider text-xs">Baseline</Badge>
                        <span className="text-xs text-muted-foreground">Original Run {simulationState.base_run_id.slice(0, 6)}</span>
                    </div>
                    <Lock className="w-3 h-3 text-slate-400" />
                </div>
                <ScrollArea className="flex-1 p-6">
                    <div className="opacity-80 hover:opacity-100 transition-opacity">
                        {baselineContent}
                    </div>
                </ScrollArea>
            </div>

            {/* RIGHT PANE: SIMULATION */}
            <div className="flex flex-col h-full bg-white dark:bg-slate-950">
                <div className="p-3 border-b flex items-center justify-between bg-teal-50/50 dark:bg-teal-950/20 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-teal-600 hover:bg-teal-700 font-mono uppercase tracking-wider text-xs">Simulation</Badge>
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                            {Object.keys(simulationState.active_modifiers).length} Active Modifiers
                        </span>
                    </div>
                    <ArrowLeftRight className="w-3 h-3 text-teal-500" />
                </div>
                <ScrollArea className="flex-1 p-6">
                    {simulatedContent ? (
                        <div className="animate-in fade-in duration-500">
                            {simulatedContent}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                            </div>
                            <p className="text-sm">Rerunning models...</p>
                        </div>
                    )}
                </ScrollArea>
            </div>

        </div>
    );
}
