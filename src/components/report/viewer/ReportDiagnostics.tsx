import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

interface SafeModeBannerProps {
  safeMode: boolean;
}

export function SafeModeBanner({ safeMode }: SafeModeBannerProps) {
  if (!safeMode) return null;
  
  return (
    <Card className="mb-4 border-amber-400 bg-amber-50 text-amber-900">
      <div className="flex items-start gap-3 p-4">
        <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <div className="font-semibold">Safe Mode (Descriptive Only)</div>
          <p className="text-sm text-amber-800">
            Validation or confidence gates are active. Insights are limited; recommendations may be hidden.
          </p>
        </div>
      </div>
    </Card>
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
    <Card className="mb-4 p-4 space-y-3">
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
