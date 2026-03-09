import { motion } from "framer-motion";
import { Database, BarChart3, Shield, AlertTriangle, TrendingUp, Lightbulb, Target } from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { Snapshot } from "@/lib/types";

interface Props {
  snapshot: Snapshot;
}

function sigStars(pval: number | undefined): string {
  if (pval === undefined || pval === null) return "";
  if (pval < 0.001) return " ***";
  if (pval < 0.01) return " **";
  if (pval < 0.05) return " *";
  return "";
}

export function ExecutiveSummaryTab({ snapshot }: Props) {
  const exec = snapshot.executive_narrative ?? {};
  const smart = snapshot.smart_narrative ?? {} as Record<string, any>;
  const deep = snapshot.deep_insights;
  const curated = snapshot.curated_kpis ?? {} as Record<string, any>;
  const trust = snapshot.trust ?? { overall_confidence: 0 };
  const modelArtifacts = snapshot.model_artifacts ?? {} as Record<string, any>;

  // Primary narrative text: executive_narrative.narrative, fall back to smart_narrative.executive_summary
  const narrativeText: string =
    exec.narrative ||
    exec.headline ||
    smart.executive_summary ||
    "";

  // Key findings: deep_insights.insights[], fall back to smart_narrative.key_findings
  const insights: Array<{ title?: string; finding: string; why_it_matters?: string; recommendation?: string; impact_score?: number; confidence?: string }> =
    (deep?.insights?.length
      ? deep.insights
      : (smart.key_findings ?? []).map((f: string) => ({ finding: f }))
    );

  // Recommendations: deep_insights.recommendations[], fall back to smart_narrative.recommendations
  const recs: Array<{ title?: string; action?: string; description?: string; priority?: string; impact?: string }> =
    (deep?.recommendations?.length
      ? deep.recommendations
      : (smart.recommendations ?? [])
    );

  // Regression metrics from model_artifacts
  const modelFit = modelArtifacts.model_fit_report as Record<string, any> | undefined;
  const r2 = modelFit?.metrics?.r2 as number | undefined;
  const rmse = modelFit?.metrics?.rmse as number | undefined;
  const baselineRmse = modelFit?.baseline_metrics?.rmse as number | undefined;

  const importanceReport = modelArtifacts.importance_report as Record<string, any> | undefined;
  const topDrivers = (importanceReport?.features as Array<any> | undefined)?.slice(0, 5);

  const coeffReport = modelArtifacts.regression_coefficients_report as Record<string, any> | undefined;
  const fStat = coeffReport?.f_statistic as number | undefined;
  const fPval = coeffReport?.f_pvalue as number | undefined;
  const r2Linear = coeffReport?.r2_linear as number | undefined;

  const warningCount = snapshot.run_warnings?.length ?? smart.warnings?.length ?? 0;
  const confidencePct = Math.round(trust.overall_confidence ?? 0);

  return (
    <div className="space-y-8">

      {/* Main narrative box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6"
      >
        {narrativeText ? (
          <p className="text-xl font-semibold leading-snug text-foreground whitespace-pre-line">
            {narrativeText}
          </p>
        ) : (
          <p className="text-base text-foreground/50 italic">
            Executive narrative is being generated — check back after the pipeline completes.
          </p>
        )}
      </motion.div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Records"
          value={(curated.rows ?? exec.data_summary?.row_count ?? 0).toLocaleString()}
          icon={Database}
          color="blue"
        />
        <MetricCard
          label="Columns"
          value={curated.columns ?? exec.data_summary?.column_count ?? 0}
          icon={BarChart3}
          color="green"
        />
        <MetricCard
          label="Confidence"
          value={`${confidencePct}%`}
          icon={Shield}
          color={confidencePct >= 70 ? "green" : confidencePct >= 40 ? "yellow" : "red"}
        />
        <MetricCard
          label="Warnings"
          value={warningCount}
          icon={AlertTriangle}
          color={warningCount > 0 ? "yellow" : "green"}
        />
      </div>

      {/* Model performance summary (if regression ran) */}
      {(r2 !== undefined || fStat !== undefined) && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" />
            Predictive Model Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {r2 !== undefined && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl font-bold text-teal-400">{(r2 * 100).toFixed(1)}%</div>
                <div className="text-xs text-foreground/60 mt-1">Variance Explained (R²)</div>
              </div>
            )}
            {r2Linear !== undefined && r2Linear !== r2 && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">{(r2Linear * 100).toFixed(1)}%</div>
                <div className="text-xs text-foreground/60 mt-1">Linear R²</div>
              </div>
            )}
            {fStat !== undefined && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {fStat >= 1000 ? fStat.toFixed(0) : fStat.toFixed(1)}
                  <span className="text-green-400 text-sm">{sigStars(fPval)}</span>
                </div>
                <div className="text-xs text-foreground/60 mt-1">F-statistic</div>
              </div>
            )}
            {rmse !== undefined && baselineRmse !== undefined && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {((1 - rmse / baselineRmse) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-foreground/60 mt-1">Better than baseline</div>
              </div>
            )}
          </div>
          {topDrivers && topDrivers.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">Top Drivers</p>
              <div className="space-y-1.5">
                {topDrivers.map((f: any, i: number) => {
                  // importance is already a percentage value (e.g. 45.3 means 45.3%)
                  const importance = typeof f.importance === "number" ? f.importance : 0;
                  const maxImportance = topDrivers[0]?.importance ?? 1;
                  const barWidth = maxImportance > 0 ? Math.round((importance / maxImportance) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-foreground/70 w-36 truncate shrink-0">{f.feature ?? f.name}</span>
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground/50 w-12 text-right shrink-0">
                        {importance.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key findings */}
      {insights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Key Findings
          </h3>
          <div className="space-y-3">
            {insights.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-teal-600/10 text-teal-500 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.title && (
                      <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                    )}
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {typeof item.finding === "string" ? item.finding : typeof item === "string" ? item : JSON.stringify(item)}
                    </p>
                    {item.why_it_matters && (
                      <p className="text-xs text-foreground/60 mt-2 leading-relaxed">
                        <span className="font-medium text-foreground/70">Why it matters: </span>
                        {item.why_it_matters}
                      </p>
                    )}
                    {item.impact_score !== undefined && (
                      <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-600/10 text-teal-400">
                        Impact: {item.impact_score}/10
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Recommendations
          </h3>
          <div className="space-y-3">
            {recs.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                  {i + 1}
                </div>
                <div className="pt-0.5 flex-1 min-w-0">
                  {rec.title && <p className="text-sm font-medium">{rec.title}</p>}
                  {(rec.action || rec.description) && (
                    <p className="text-sm text-foreground/80 mt-1">{rec.action ?? rec.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {rec.priority && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {rec.priority}
                      </span>
                    )}
                    {rec.impact && (
                      <span className="text-[10px] text-foreground/50">{rec.impact}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {(snapshot.run_warnings?.length ?? 0) > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Warnings
          </h3>
          <div className="space-y-2">
            {snapshot.run_warnings!.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-foreground/80"
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
