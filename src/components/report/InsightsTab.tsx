import { motion } from "framer-motion";
import { TrendingUp, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { InsightCard } from "./InsightCard";
import type { DeepInsights, GovInsight } from "@/lib/types";

interface Props {
  deepInsights?: DeepInsights;
  govInsights?: GovInsight[];
  insights?: GovInsight[];
}

function impactColor(score: number) {
  if (score >= 80) return { text: "text-red-400", bg: "bg-red-500/10" };
  if (score >= 60) return { text: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { text: "text-blue-400", bg: "bg-blue-500/10" };
}

export function InsightsTab({ deepInsights, govInsights, insights }: Props) {
  const diInsights = deepInsights?.insights ?? [];
  const curiosity = deepInsights?.curiosity_insights ?? [];
  const headline = deepInsights?.headline_insight;
  const recs = deepInsights?.recommendations ?? [];
  const fallbackInsights = govInsights ?? insights ?? [];

  if (diInsights.length === 0 && fallbackInsights.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No insights were generated for this analysis.
      </div>
    );
  }

  // If we have deep insights, show them
  if (diInsights.length > 0) {
    return (
      <div className="space-y-8">
        {headline && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                Headline Finding
              </span>
            </div>
            <p className="text-xl font-semibold mb-2">{headline.title}</p>
            <p className="text-foreground/80 leading-relaxed">{headline.finding}</p>
          </motion.div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">
            AI-Generated Insights
            <span className="text-muted-foreground font-normal text-sm ml-2">
              ({diInsights.length})
            </span>
          </h3>
          <div className="space-y-3">
            {diInsights.map((insight, i) => {
              const colors = impactColor(insight.impact_score);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-semibold">{insight.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                        Impact: {insight.impact_score}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {insight.confidence}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-2">{insight.finding}</p>
                  <p className="text-xs text-foreground/60 mb-2">
                    <span className="font-medium text-foreground/70">Why it matters:</span> {insight.why_it_matters}
                  </p>
                  <p className="text-xs text-blue-400">
                    <span className="font-medium">Recommendation:</span> {insight.recommendation}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>

        {curiosity.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Curiosity Findings
              <span className="text-muted-foreground font-normal text-sm">
                ({curiosity.length})
              </span>
            </h3>
            <div className="space-y-3">
              {curiosity.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4"
                >
                  <h4 className="text-sm font-semibold mb-1">{c.title}</h4>
                  <p className="text-sm text-foreground/80">{c.finding}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {recs.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Prioritized Recommendations</h3>
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
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{rec.title}</p>
                    <p className="text-sm text-foreground/80 mt-1">{rec.action}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {rec.priority}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {rec.impact}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback: governed insights
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Governed Insights
          <span className="text-muted-foreground font-normal text-sm ml-2">
            ({fallbackInsights.length})
          </span>
        </h3>
      </div>
      {fallbackInsights.map((insight, i) => (
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
