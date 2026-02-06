import { motion } from "framer-motion";
import { AlertTriangle, Brain, Eye, Zap, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HypothesesData, Hypothesis } from "@/lib/types";
import { useState } from "react";

interface Props {
  hypotheses?: HypothesesData;
}

const TYPE_CONFIG = {
  charitable: { label: "Charitable", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: Eye },
  suspicious: { label: "Suspicious", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertTriangle },
  wild: { label: "Wild", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Zap },
  unknown: { label: "Unknown", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Brain },
};

function HypothesisCard({ h, index }: { h: Hypothesis; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[h.hypothesis_type] || TYPE_CONFIG.unknown;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "rounded-xl border bg-card p-4",
        h.is_red_flag ? "border-red-500/30" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
            <Icon className={cn("w-4 h-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium", config.bg, config.color)}>
                {config.label}
              </span>
              {h.is_red_flag && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium flex items-center gap-1">
                  <Flag className="w-2.5 h-2.5" />
                  Red Flag
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Confidence: {h.confidence}/10
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{h.finding_title}</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{h.hypothesis}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 ml-11 space-y-3"
        >
          {h.expected_evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-400 mb-1">What would prove this:</p>
              <ul className="space-y-1">
                {h.expected_evidence.map((e, i) => (
                  <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {h.disproving_evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-400 mb-1">What would disprove this:</p>
              <ul className="space-y-1">
                {h.disproving_evidence.map((e, i) => (
                  <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function HypothesesTab({ hypotheses }: Props) {
  if (!hypotheses || !hypotheses.hypotheses?.length) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No hypotheses were generated for this analysis.
      </div>
    );
  }

  const redFlags = hypotheses.red_flags || [];
  const charitable = hypotheses.hypotheses.filter((h) => h.hypothesis_type === "charitable");
  const suspicious = hypotheses.hypotheses.filter((h) => h.hypothesis_type === "suspicious");
  const wild = hypotheses.hypotheses.filter((h) => h.hypothesis_type === "wild");
  const unknown = hypotheses.hypotheses.filter((h) => h.hypothesis_type === "unknown");

  return (
    <div className="space-y-8">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{hypotheses.hypothesis_count}</p>
          <p className="text-xs text-muted-foreground">Total Hypotheses</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{hypotheses.red_flag_count}</p>
          <p className="text-xs text-muted-foreground">Red Flags</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{charitable.length}</p>
          <p className="text-xs text-muted-foreground">Charitable</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{wild.length}</p>
          <p className="text-xs text-muted-foreground">Wild Theories</p>
        </div>
      </div>

      {/* Boldest hypothesis */}
      {hypotheses.boldest_hypothesis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
              Boldest Hypothesis
            </h3>
          </div>
          <p className="text-foreground leading-relaxed">
            {hypotheses.boldest_hypothesis.hypothesis}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Re: {hypotheses.boldest_hypothesis.finding_title} — Confidence: {hypotheses.boldest_hypothesis.confidence}/10
          </p>
        </motion.div>
      )}

      {/* Red flags section */}
      {redFlags.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Red Flags to Investigate ({redFlags.length})
          </h3>
          <div className="space-y-3">
            {redFlags.map((h, i) => (
              <HypothesisCard key={`rf-${i}`} h={h} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Suspicious */}
      {suspicious.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Suspicious ({suspicious.length})
          </h3>
          <div className="space-y-3">
            {suspicious.map((h, i) => (
              <HypothesisCard key={`sus-${i}`} h={h} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Charitable */}
      {charitable.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-400" />
            Charitable ({charitable.length})
          </h3>
          <div className="space-y-3">
            {charitable.map((h, i) => (
              <HypothesisCard key={`cha-${i}`} h={h} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Wild */}
      {wild.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            Wild Theories ({wild.length})
          </h3>
          <div className="space-y-3">
            {wild.map((h, i) => (
              <HypothesisCard key={`wild-${i}`} h={h} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Unknown */}
      {unknown.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            Other Theories ({unknown.length})
          </h3>
          <div className="space-y-3">
            {unknown.map((h, i) => (
              <HypothesisCard key={`unk-${i}`} h={h} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
