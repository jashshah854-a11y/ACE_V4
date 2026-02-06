import { motion } from "framer-motion";
import { Database, Sparkles, AlertTriangle, Shield } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { Snapshot } from "@/lib/types";

interface Props {
  snapshot: Snapshot;
}

export function ExecutiveSummaryTab({ snapshot }: Props) {
  const { executive_narrative, deep_insights, hypotheses, trust } = snapshot;
  const redFlagCount =
    hypotheses.red_flags?.length ??
    hypotheses.hypotheses.filter((h) => h.is_red_flag).length;
  const insightCount = deep_insights.insights.length;
  const rowCount = snapshot.identity.row_count ?? 0;

  const topRecs = (
    deep_insights.recommendations ??
    deep_insights.insights
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 3)
      .map((i) => i.recommendation)
  ).slice(0, 3);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6"
      >
        <p className="text-2xl font-bold leading-snug text-foreground">
          {executive_narrative.headline}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Records Analyzed"
          value={rowCount.toLocaleString()}
          icon={Database}
          color="blue"
        />
        <MetricCard
          label="Insights Found"
          value={insightCount}
          icon={Sparkles}
          color="green"
        />
        <MetricCard
          label="Red Flags"
          value={redFlagCount}
          icon={AlertTriangle}
          color={redFlagCount > 0 ? "red" : "green"}
        />
        <MetricCard
          label="Confidence"
          value={`${trust.overall_confidence}%`}
          icon={Shield}
          color={
            trust.overall_confidence >= 70
              ? "green"
              : trust.overall_confidence >= 40
                ? "yellow"
                : "red"
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Executive Narrative</h3>
        <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
          {executive_narrative.narrative}
        </p>
      </div>

      {topRecs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Top Recommendations</h3>
          <div className="space-y-3">
            {topRecs.map((rec, i) => (
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
                <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                  {rec}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
