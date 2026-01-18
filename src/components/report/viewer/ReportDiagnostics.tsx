import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, HelpCircle } from "lucide-react";
import { GuidanceOverlay } from "@/components/report/GuidanceOverlay";
import type { GuidanceNote } from "@/types/reportTypes";
import { focusGuidance } from "@/lib/guidanceFocus";

interface SafeModeBannerProps {
  safeMode: boolean;
  limitationsReason?: string | null;
  onHelpClick?: () => void;
}

export function SafeModeBanner({ safeMode, limitationsReason, onHelpClick }: SafeModeBannerProps) {
  if (!safeMode) return null;

  const handleClick = () => {
    if (onHelpClick) {
      onHelpClick();
      return;
    }
    focusGuidance("diagnostics");
  };

  return (
    <div className="w-full bg-amber-50 border-l-4 border-amber-500 p-4 flex items-center gap-3 shadow-sm mb-4">
      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
      <div className="flex-1">
        <div className="font-medium text-sm text-amber-900 mb-1">Safe Mode Active</div>
        <div className="text-sm text-amber-800">
          {limitationsReason || "Predictive modeling is paused due to insufficient target variance. Descriptive insights remain available."}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="shrink-0 text-amber-900 hover:text-amber-950 hover:bg-amber-100 border border-amber-300"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help Me Fix This
      </Button>
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
  guidanceNotes?: GuidanceNote[];
}

export function DiagnosticsCard({
  confidenceMode,
  safeModeReasons,
  decisionSummary,
  taskContractSummary,
  hasTimeField,
  onConfidenceModeChange,
  guidanceNotes,
}: DiagnosticsCardProps) {
  const showGuidanceButton = guidanceNotes && guidanceNotes.length > 0;

  return (
    <Card id="identity-audit" className="mb-4 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Diagnostics</div>
          <div className="text-sm font-semibold">Why Am I in Safe Mode?</div>
        </div>
        <div className="flex gap-2 flex-wrap items-center justify-end">
          {showGuidanceButton ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-amber-700 hover:text-amber-900"
              onClick={() => focusGuidance("diagnostics")}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              Show Guidance
            </Button>
          ) : null}
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
      {guidanceNotes?.length ? (
        <GuidanceOverlay notes={guidanceNotes} limit={3} context="diagnostics" className="!mb-4" />
      ) : null}
      <div className="mt-2 text-xs text-muted-foreground">
        Scope check: {decisionSummary || taskContractSummary ? "OK" : "No contract/scope provided"} - Fields:{" "}
        {hasTimeField ? "Time present" : "Time missing"}
      </div>
    </Card>
  );
}

