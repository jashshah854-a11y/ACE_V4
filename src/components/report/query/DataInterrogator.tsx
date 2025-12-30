
import React from "react";
import {
    ContextMenu,
    ContextMenuTrigger,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Sparkles, BarChart2, AlertTriangle, Users } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { toast } from "sonner"; // Assuming sonner is used as in other parts

type InterrogatorType = 'segment' | 'trend' | 'outlier' | 'general';

interface DataInterrogatorProps {
    children: React.ReactNode;
    dataPointId: string;
    type?: InterrogatorType;
    label?: string; // Human readable label "e.g. Q3 Spike"
    contextData?: any; // Extra data payload for the query
}

export function DataInterrogator({
    children,
    dataPointId,
    type = 'general',
    label,
    contextData
}: DataInterrogatorProps) {
    const { startQuery, simulationState } = useSimulation();

    const handleQuery = (intent: string) => {
        startQuery(dataPointId, intent);
        toast.message("Analyst Core Activated", {
            description: `Analyzing ${label || dataPointId}: "${intent}"`,
            icon: <Sparkles className="w-4 h-4 text-teal-500" />
        });
    };

    const isSafeMode = simulationState.safe_mode;

    const getPrompts = () => {
        switch (type) {
            case 'segment':
                return [
                    { intent: "Why is this group performing poorly?", icon: <BarChart2 className="w-4 h-4" /> },
                    { intent: "What are their top traits?", icon: <Users className="w-4 h-4" /> },
                    { intent: "Compare with high-performers", icon: <BarChart2 className="w-4 h-4" /> }
                ];
            case 'trend':
                return [
                    { intent: "What caused the spike?", icon: <BarChart2 className="w-4 h-4" /> },
                    { intent: "Is this seasonality?", icon: <Sparkles className="w-4 h-4" /> },
                    { intent: "Forecast next month", icon: <BarChart2 className="w-4 h-4" /> }
                ];
            case 'outlier':
                return [
                    { intent: "Is this an error or a signal?", icon: <AlertTriangle className="w-4 h-4" /> },
                    { intent: "Show impact if excluded", icon: <BarChart2 className="w-4 h-4" /> },
                ];
            default:
                return [
                    { intent: "Explain this data point", icon: <Sparkles className="w-4 h-4" /> },
                    { intent: "Show underlying records", icon: <BarChart2 className="w-4 h-4" /> }
                ];
        }
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div className="cursor-context-menu ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm transition-all hover:ring-1 hover:ring-teal-500/50">
                    {children}
                </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-64 font-sans bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <ContextMenuLabel className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <Sparkles className="w-4 h-4" />
                    ACE Interrogator
                </ContextMenuLabel>
                <ContextMenuSeparator />

                <div className="px-2 py-1.5 text-xs text-slate-500">
                    Ask about <strong>{label || dataPointId}</strong>
                </div>

                {isSafeMode ? (
                    <ContextMenuItem disabled className="gap-2 text-amber-600 dark:text-amber-500 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Exploration Disabled</span>
                    </ContextMenuItem>
                ) : (
                    getPrompts().map((prompt, idx) => (
                        <ContextMenuItem
                            key={idx}
                            onClick={() => handleQuery(prompt.intent)}
                            className="gap-2 cursor-pointer focus:bg-teal-50 dark:focus:bg-teal-900/20 focus:text-teal-700 dark:focus:text-teal-300"
                        >
                            {prompt.icon}
                            <span>{prompt.intent}</span>
                        </ContextMenuItem>
                    ))
                )}

                {isSafeMode && (
                    <div className="px-2 py-2 text-[10px] text-muted-foreground leading-snug border-t border-slate-100 mt-1">
                        High-trust data required for automated analysis. <button className="underline text-slate-900 hover:text-teal-600" onClick={() => console.log('View Audit')}>View Audit</button>
                    </div>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
