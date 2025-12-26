import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LimitationBannerProps {
  message: string;
  fields?: string[];
  severity?: "warning" | "critical";
  className?: string;
}

export function LimitationBanner({ message, fields, severity = "warning", className }: LimitationBannerProps) {
  const isCritical = severity === "critical";
  return (
    <Alert
      variant={isCritical ? "destructive" : "default"}
      className={cn(
        "border-2",
        isCritical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
        className
      )}
    >
      <AlertTriangle className={cn("h-4 w-4", isCritical ? "text-red-600" : "text-amber-600")} />
      <AlertTitle className="text-sm font-semibold">Data Health Warning</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
        {message}
        {fields?.length ? (
          <span className="block mt-1 text-[11px] uppercase tracking-wide">
            Missing: {fields.slice(0, 4).join(", ")}
            {fields.length > 4 ? "…" : ""}
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
