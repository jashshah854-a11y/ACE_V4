import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RunWarning {
  code: string;
  message: string;
}

interface RunWarningsBannerProps {
  warnings?: RunWarning[];
  className?: string;
}

export function RunWarningsBanner({ warnings, className }: RunWarningsBannerProps) {
  const [open, setOpen] = useState(false);
  const deduped = useMemo(() => {
    const map = new Map<string, RunWarning>();
    (warnings || []).forEach((warning) => {
      if (warning?.code && !map.has(warning.code)) {
        map.set(warning.code, warning);
      }
    });
    return Array.from(map.values());
  }, [warnings]);

  if (!deduped.length) return null;

  return (
    <div className={cn("rounded-2xl border border-amber-200 bg-amber-50/80 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Run Warnings ({deduped.length})
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"
        >
          {open ? "Hide" : "Show"} {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
      {open && (
        <ul className="mt-3 space-y-2 text-sm text-amber-900">
          {deduped.map((warning) => (
            <li key={warning.code} className="rounded-lg bg-white/70 px-3 py-2">
              <span className="font-mono text-[11px] uppercase text-amber-700">{warning.code}</span>
              <div>{warning.message}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
