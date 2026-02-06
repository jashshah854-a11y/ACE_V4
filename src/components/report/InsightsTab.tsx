import { motion } from "framer-motion";
import { InsightCard } from "./InsightCard";
import type { Insight } from "@/lib/types";

interface Props {
  insights: Insight[];
}

export function InsightsTab({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No insights were generated for this analysis.
      </div>
    );
  }

  const sorted = [...insights].sort(
    (a, b) => b.impact_score - a.impact_score,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          All Insights
          <span className="text-muted-foreground font-normal text-sm ml-2">
            ({insights.length})
          </span>
        </h3>
      </div>
      {sorted.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <InsightCard insight={insight} />
        </motion.div>
      ))}
    </div>
  );
}
