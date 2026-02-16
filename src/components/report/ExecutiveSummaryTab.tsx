import { motion } from "framer-motion";
import { Database, BarChart3, Shield, AlertTriangle } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { Snapshot } from "@/lib/types";

interface Props {
  snapshot: Snapshot;
}

export function ExecutiveSummaryTab({ snapshot }: Props) {
  const smart_narrative = snapshot.smart_narrative ?? {} as Record<string, any>;
  const curated_kpis = snapshot.curated_kpis ?? {} as Record<string, any>;
  const trust = snapshot.trust ?? { overall_confidence: 0 };
  const warningCount = smart_narrative.warnings?.length ?? 0;
  const recs = smart_narrative.recommendations ?? [];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6"
      >
        <p className="text-xl font-semibold leading-snug text-foreground">
          {smart_narrative.executive_summary}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Records"
          value={(curated_kpis.rows ?? 0).toLocaleString()}
          icon={Database}
          color="blue"
        />
        <MetricCard
          label="Columns"
          value={curated_kpis.columns ?? 0}
          icon={BarChart3}
          color="green"
        />
        <MetricCard
          label="Confidence"
          value={`${Math.round(trust.overall_confidence)}%`}
          icon={Shield}
          color={
            trust.overall_confidence >= 70
              ? "green"
              : trust.overall_confidence >= 40
                ? "yellow"
                : "red"
          }
        />
        <MetricCard
          label="Warnings"
          value={warningCount}
          icon={AlertTriangle}
          color={warningCount > 0 ? "yellow" : "green"}
        />
      </div>

      {smart_narrative.data_story && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Data Story</h3>
          <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
            {smart_narrative.data_story}
          </p>
        </div>
      )}

      {smart_narrative.key_findings?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Key Findings</h3>
          <div className="space-y-2">
            {smart_narrative.key_findings.map((finding, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="w-6 h-6 rounded-md bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {typeof finding === "string" ? finding : JSON.stringify(finding)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                  P{i + 1}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-medium">{rec.title}</p>
                  <p className="text-sm text-foreground/80 mt-1">{rec.description}</p>
                  {rec.priority && (
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {rec.priority}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {smart_narrative.warnings?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Warnings
          </h3>
          <div className="space-y-2">
            {smart_narrative.warnings.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-foreground/80"
              >
                {typeof w === "string" ? w : JSON.stringify(w)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
