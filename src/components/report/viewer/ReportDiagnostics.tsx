import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, HelpCircle } from "lucide-react";

interface SafeModeBannerProps {
  safeMode: boolean;
  limitationsReason?: string | null;
  onHelpClick?: () => void;
}

export function SafeModeBanner({ safeMode, limitationsReason, onHelpClick }: SafeModeBannerProps) {
  if (!safeMode) return null;

  return (
    <div className="w-full bg-amber-50 border-l-4 border-amber-500 p-4 flex items-center gap-3 shadow-sm mb-4">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
      <div className="flex-1">
        <div className="font-medium text-sm text-amber-900 mb-1">Safe Mode Active</div>
        <div className="text-sm text-amber-800">
          {limitationsReason || "Predictive modeling disabled due to insufficient target variance. Showing descriptive facts only."}
        </div>
      </div>
      {onHelpClick && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onHelpClick}
          className="shrink-0 text-amber-900 hover:text-amber-950 hover:bg-amber-100 border border-amber-300"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help Me Fix This
        </Button>
      )}
    </div>
  );
}

interface DiagnosticsCardProps {
  confidenceMode: "strict" | "exploratory";
  safeModeReasons: string[];
  decisionSummary?: string;
  taskContractSummary?: string;
  hasTimeField: boolean;
  onConfidenceModeChange: (mode: "strict" | "exploratory") => void;
}

export function DiagnosticsCard({
  confidenceMode,
  safeModeReasons,
  decisionSummary,
  taskContractSummary,
  hasTimeField,
  onConfidenceModeChange,
}: DiagnosticsCardProps) {
  return (
    <Card id="identity-audit" className="mb-4 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Diagnostics</div>
          <div className="text-sm font-semibold">Why Am I in Safe Mode?</div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={confidenceMode === "strict" ? "default" : "outline"}
            onClick={() => onConfidenceModeChange("strict")}
          >
            Strict (&gt;=90%)
          </Button>
          <Button
            size="sm"
            variant={confidenceMode === "exploratory" ? "default" : "outline"}
            onClick={() => onConfidenceModeChange("exploratory")}
          >
            Exploratory (&gt;=60%)
          </Button>
        </div>
      </div>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        {safeModeReasons.length === 0 && <li>No blocking reasons detected.</li>}
        {safeModeReasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <div className="mt-2 text-xs text-muted-foreground">
        Scope check: {decisionSummary || taskContractSummary ? "OK" : "No contract/scope provided"} • Fields:{" "}
        {hasTimeField ? "Time present" : "Time missing"}
      </div>
    </Card>
  );
}
