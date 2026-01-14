import { Lightbulb, AlertTriangle, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useCallback, type ComponentType } from "react";
import type { GuidanceNote } from "@/types/reportTypes";
import { cn } from "@/lib/utils";

interface GuidanceOverlayProps {
  notes?: GuidanceNote[];
  limit?: number;
  context?: string;
  className?: string;
}

const severityConfig: Record<NonNullable<GuidanceNote["severity"]>, { text: string; badgeClass: string; icon: ComponentType<any> }> = {
  info: {
    text: "Info",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
    icon: Lightbulb,
  },
  warning: {
    text: "Warning",
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    icon: AlertTriangle,
  },
  critical: {
    text: "Critical",
    badgeClass: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    icon: ShieldAlert,
  },
};

export function GuidanceOverlay({ notes, limit = 4, context = "global", className }: GuidanceOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const focusSelf = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.animate(
      [
        { boxShadow: "0 0 0 rgba(0,0,0,0)" },
        { boxShadow: "0 0 0 4px rgba(251, 191, 36, 0.7)" },
        { boxShadow: "0 0 0 rgba(0,0,0,0)" },
      ],
      { duration: 1200, easing: "ease-in-out" }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const { detail } = event as CustomEvent<{ context?: string }>;
      if (detail?.context && detail.context !== context) return;
      focusSelf();
    };

    window.addEventListener("ace:focus-guidance", handler as EventListener);
    return () => window.removeEventListener("ace:focus-guidance", handler as EventListener);
  }, [context, focusSelf]);

  if (!notes || notes.length === 0) return null;

  const trimmed = notes.slice(0, limit);

  return (
    <div
      ref={containerRef}
      data-guidance-overlay="true"
      data-guidance-context={context}
      className={cn(
        "rounded-2xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 mb-6",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 flex items-center justify-center">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Governance guidance</p>
          <p className="text-xs text-muted-foreground">These hints come directly from the diagnostics and confidence agents.</p>
        </div>
      </div>
      <div className="space-y-2">
        {trimmed.map((note) => {
          const config = severityConfig[note.severity];
          const Icon = config.icon;
          return (
            <div
              key={note.id}
              className="flex items-start gap-3 rounded-lg border border-border/30 bg-white/70 dark:bg-slate-900/40 p-3"
            >
              <div className={cn("mt-1 rounded-full p-1", config.badgeClass)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{note.source || "Diagnostics"}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", config.badgeClass)}>
                    {config.text}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-1">{note.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
