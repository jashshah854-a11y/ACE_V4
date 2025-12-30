
import React from "react";
import { useSimulation } from "@/context/SimulationContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SimulationControls() {
    const { simulationState, updateModifiers, initializeSimulation } = useSimulation();
    const { active_modifiers } = simulationState;

    const handleToggle = (key: keyof typeof active_modifiers, value: boolean) => {
        updateModifiers({ [key]: value });
    };

    const handleReset = () => {
        initializeSimulation(simulationState.base_run_id);
    };

    return (
        <Card className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                    <Settings2 className="w-4 h-4" />
                    Scenario Controls
                </h3>
                {(Object.keys(active_modifiers).length > 0 || simulationState.comparison_mode) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={handleReset}
                    >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="exclude-outliers" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Exclude Extreme Outliers
                    </Label>
                    <Switch
                        id="exclude-outliers"
                        checked={!!active_modifiers.exclude_outliers}
                        onCheckedChange={(checked: boolean) => handleToggle("exclude_outliers", checked)}
                    />
                </div>

                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="filter-q4" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Limit to Q4 (Holiday)
                    </Label>
                    <Switch
                        id="filter-q4"
                        // Mocking a time frame modifier for now using a boolean-like check or custom logic
                        checked={active_modifiers.time_frame?.start === "2023-10-01"}
                        onCheckedChange={(checked: boolean) =>
                            updateModifiers({
                                time_frame: checked ? { start: "2023-10-01", end: "2023-12-31" } : undefined
                            })
                        }
                    />
                </div>

                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="high-confidence" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        High Fidelity Mode (&gt;90% Conf.)
                    </Label>
                    <Switch
                        id="high-confidence"
                        // Assuming this might be mapped to a filter_segment or similar in the future, 
                        // for now just tracking it as a generic modifier
                        checked={!!active_modifiers.filter_segment && active_modifiers.filter_segment === "high_confidence"}
                        onCheckedChange={(checked: boolean) =>
                            updateModifiers({ filter_segment: checked ? "high_confidence" : undefined })
                        }
                    />
                </div>
            </div>

            {simulationState.comparison_mode && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                        </span>
                        Simulation Active
                    </div>
                </div>
            )}
        </Card>
    );
}
