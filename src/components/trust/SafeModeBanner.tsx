import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useSimulation } from "@/context/SimulationContext";
import { Button } from "@/components/ui/button";

export function SimulationSafeModeBanner() {
    const { simulationState } = useSimulation();

    if (!simulationState.safe_mode) return null;

    return (
        <div className="w-full bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-center gap-3 text-amber-900 shadow-sm relative z-40 animate-in slide-in-from-top-2">
            <div className="p-2 bg-amber-200 rounded-full shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 md:flex-none max-w-4xl text-sm font-medium flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                <span>
                    <strong>Safe Mode Active:</strong> Data quality metrics have dropped below the methodologically sound threshold for this analysis.
                </span>
                <span className="hidden md:inline w-px h-4 bg-amber-300 mx-2" />
                <span className="opacity-90">
                    Exploratory features and predictive models are disabled to prevent hallucinations.
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="text-xs hover:bg-amber-200 text-amber-800 underline underline-offset-4"
                onClick={() => {
                    // Placeholder for "View Audit" action -> Phase 4
                    console.log("View Audit clicked");
                }}
            >
                Why?
            </Button>
        </div>
    );
}
