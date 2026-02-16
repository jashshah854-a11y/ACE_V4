import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trust, GovernedReport } from "@/lib/types";

interface Props {
  trust: Trust;
  governedReport: GovernedReport;
  warnings?: string[];
}

function statusColor(status: string) {
  switch (status) {
    case "high": return "text-green-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

function statusBg(status: string) {
  switch (status) {
    case "high": return "bg-green-500/10";
    case "medium": return "bg-yellow-500/10";
    case "low": return "bg-red-500/10";
    default: return "bg-secondary";
  }
}

export function TrustTab({ trust, governedReport, warnings }: Props) {
  const safeTrust = trust ?? { overall_confidence: 0, components: {}, applied_caps: [] };
  const safeGovReport = governedReport ?? { limitations: [] };
  const components = safeTrust.components ?? {};
  const caps = safeTrust.applied_caps ?? [];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold">Overall Confidence</h3>
            <p className="text-sm text-muted-foreground">
              Composite trust score across all analysis dimensions
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">
            {Math.round(safeTrust.overall_confidence)}%
          </span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden mt-4">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              safeTrust.overall_confidence >= 70
                ? "bg-green-500"
                : safeTrust.overall_confidence >= 40
                  ? "bg-yellow-500"
                  : "bg-red-500",
            )}
            style={{ width: `${safeTrust.overall_confidence}%` }}
          />
        </div>
      </motion.div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Trust Components</h3>
        <div className="grid gap-3">
          {Object.entries(components).map(([key, comp], i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", statusBg(comp.status))}>
                    {comp.status === "high" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : comp.status === "medium" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                    ) : comp.status === "unknown" ? (
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </div>
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                </div>
                <span className={cn("text-sm font-bold", statusColor(comp.status))}>
                  {comp.score !== null ? `${Math.round(comp.score)}%` : "N/A"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{comp.notes}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {caps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-yellow-400">Applied Caps</h3>
          <div className="space-y-2">
            {caps.map((cap, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm"
              >
                <span className="font-mono text-xs text-yellow-400">{cap.code}</span>
                <span className="text-muted-foreground ml-2">(max: {cap.max}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {safeGovReport.limitations && safeGovReport.limitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Limitations</h3>
          <ul className="space-y-2">
            {safeGovReport.limitations.map((lim, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(warnings?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Run Warnings</h3>
          <div className="space-y-2">
            {warnings!.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-3 text-sm text-foreground/80"
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
