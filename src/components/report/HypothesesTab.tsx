import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { HypothesisCard } from "./HypothesisCard";
import type { Hypothesis } from "@/lib/types";

interface Props {
  hypotheses: Hypothesis[];
}

export function HypothesesTab({ hypotheses }: Props) {
  if (hypotheses.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No hypotheses were generated for this analysis.
      </div>
    );
  }

  const redFlags = hypotheses.filter((h) => h.is_red_flag);
  const charitable = hypotheses.filter((h) => h.hypothesis_type === "charitable");
  const suspicious = hypotheses.filter((h) => h.hypothesis_type === "suspicious");
  const wild = hypotheses.filter((h) => h.hypothesis_type === "wild");

  return (
    <div className="space-y-8">
      {redFlags.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">
              Red Flags to Investigate
            </h3>
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">
              {redFlags.length}
            </span>
          </div>
          <div className="space-y-3">
            {redFlags.map((h, i) => (
              <motion.div
                key={`rf-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <HypothesisCard hypothesis={h} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {[
        { items: charitable, label: "Charitable Hypotheses" },
        { items: suspicious, label: "Suspicious Hypotheses" },
        { items: wild, label: "Wild Hypotheses" },
      ]
        .filter((g) => g.items.length > 0)
        .map((group) => (
          <section key={group.label}>
            <h3 className="text-lg font-semibold mb-4">
              {group.label}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({group.items.length})
              </span>
            </h3>
            <div className="space-y-3">
              {group.items.map((h, i) => (
                <motion.div
                  key={`${group.label}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <HypothesisCard hypothesis={h} />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
