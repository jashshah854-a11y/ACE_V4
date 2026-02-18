import { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PieChart,
  Database,
  Activity,
  Sparkles,
  Brain,
} from "lucide-react";

interface SmartSummaryProps {
  snapshot: any;
  analytics?: any;
  artifacts?: any;
}

interface LLMNarrative {
  executive_summary: string;
  key_findings: string[];
  data_story: string;
  recommendations: Array<{ title: string; description: string; priority: string }>;
  warnings: string[];
  generated_at?: string;
  model_used?: string;
}

/**
 * SmartSummary - Transforms raw analytics data into human-readable insights
 *
 * Prioritizes LLM-generated narratives when available (from smart_narrative),
 * falls back to heuristic-based generation otherwise.
 */
export function SmartSummary({ snapshot, analytics, artifacts }: SmartSummaryProps) {
  // Check for LLM-generated narrative first
  const llmNarrative: LLMNarrative | null = snapshot?.smart_narrative || null;
  const hasLLMNarrative = llmNarrative && llmNarrative.executive_summary && llmNarrative.model_used !== "fallback";

  const insights = useMemo(() => generateInsights(snapshot, analytics, artifacts), [snapshot, analytics, artifacts]);

  // If we have LLM narrative, show that first
  if (hasLLMNarrative) {
    return (
      <div className="space-y-6">
        {/* LLM-Generated Executive Summary */}
        <section className="rounded-2xl border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
              <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI-Generated Executive Summary</h3>
              <p className="text-xs text-muted-foreground">
                Powered by {llmNarrative.model_used || "Gemini"}
                {llmNarrative.generated_at && ` • Generated ${new Date(llmNarrative.generated_at).toLocaleString()}`}
              </p>
            </div>
          </div>
          <p className="text-base leading-relaxed text-foreground/90">
            {llmNarrative.executive_summary}
          </p>
        </section>

        {/* Key Findings */}
        {llmNarrative.key_findings && llmNarrative.key_findings.length > 0 && (
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold">Key Findings</h3>
            </div>
            <ul className="space-y-3">
              {llmNarrative.key_findings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-sm text-foreground/90 leading-relaxed">{finding}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Data Story */}
        {llmNarrative.data_story && (
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold">The Data Story</h3>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {llmNarrative.data_story.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-sm text-foreground/85 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* AI Recommendations */}
        {llmNarrative.recommendations && llmNarrative.recommendations.length > 0 && (
          <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                AI Recommendations
              </h3>
            </div>
            <div className="space-y-4">
              {llmNarrative.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-white dark:bg-emerald-900/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-emerald-900 dark:text-emerald-100">
                      {rec.title}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      rec.priority === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                      rec.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200/80">
                    {rec.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Warnings */}
        {llmNarrative.warnings && llmNarrative.warnings.length > 0 && llmNarrative.warnings[0] !== "LLM narrative generation unavailable - showing basic summary" && (
          <section className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
                Data Caveats
              </h3>
            </div>
            <ul className="space-y-2">
              {llmNarrative.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-rose-800 dark:text-rose-200">
                  <span className="mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Show heuristic insights as supplementary */}
        {insights && insights.identity && insights.identity.length > 0 && (
          <details className="rounded-2xl border bg-card overflow-hidden">
            <summary className="p-4 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              View detailed metrics
            </summary>
            <div className="p-4 pt-0 border-t">
              <HeuristicInsightsContent insights={insights} />
            </div>
          </details>
        )}
      </div>
    );
  }

  // Fallback to heuristic-based insights
  if (!insights || insights.sections.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">No insights available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeuristicInsightsContent insights={insights} />
    </div>
  );
}

/**
 * Renders heuristic-based insights (used when LLM narrative is unavailable)
 */
function HeuristicInsightsContent({ insights }: { insights: Insight }) {
  return (
    <>
      {/* Dataset Identity Card */}
      {insights.identity && (
        <section className="rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold">Dataset Overview</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {insights.identity.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                {item.subtext && (
                  <p className="text-xs text-muted-foreground mt-1">{item.subtext}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Metrics */}
      {insights.keyMetrics && insights.keyMetrics.length > 0 && (
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Key Metrics</h3>
          </div>
          <div className="grid gap-3">
            {insights.keyMetrics.map((metric, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MetricIcon type={metric.type} />
                  <div>
                    <p className="font-medium text-foreground">{metric.label}</p>
                    {metric.description && (
                      <p className="text-sm text-muted-foreground">{metric.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{metric.value}</p>
                  {metric.change && (
                    <p className={`text-xs ${metric.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {metric.change}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sections with insights */}
      {insights.sections.map((section, sIdx) => (
        <section key={sIdx} className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <SectionIcon type={section.type} />
            <h3 className="text-lg font-semibold">{section.title}</h3>
          </div>

          {/* Bullet points */}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-3 mb-4">
              {section.bullets.map((bullet, bIdx) => (
                <li key={bIdx} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-sm text-foreground/90">{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Distribution bars */}
          {section.distribution && section.distribution.length > 0 && (
            <div className="space-y-3">
              {section.distribution.map((item, dIdx) => (
                <div key={dIdx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.count != null ? `${formatNumber(item.count)} ` : ''}
                      ({item.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key-value pairs */}
          {section.stats && section.stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {section.stats.map((stat, stIdx) => (
                <div key={stIdx} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
              Actionable Insights
            </h3>
          </div>
          <div className="space-y-4">
            {insights.recommendations.map((rec, rIdx) => (
              <div key={rIdx} className="bg-white dark:bg-amber-900/20 rounded-xl p-4">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {rec.title}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200/80">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Quality Warnings */}
      {insights.warnings && insights.warnings.length > 0 && (
        <section className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
              Data Quality Alerts
            </h3>
          </div>
          <ul className="space-y-2">
            {insights.warnings.map((warning, wIdx) => (
              <li key={wIdx} className="flex items-start gap-2 text-sm text-rose-800 dark:text-rose-200">
                <span className="mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function MetricIcon({ type }: { type?: string }) {
  switch (type) {
    case 'positive':
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'negative':
      return <AlertTriangle className="h-5 w-5 text-rose-600" />;
    case 'trending-up':
      return <TrendingUp className="h-5 w-5 text-emerald-600" />;
    case 'trending-down':
      return <TrendingDown className="h-5 w-5 text-rose-600" />;
    default:
      return <BarChart3 className="h-5 w-5 text-teal-600" />;
  }
}

function SectionIcon({ type }: { type?: string }) {
  switch (type) {
    case 'distribution':
      return <PieChart className="h-5 w-5 text-indigo-600" />;
    case 'trend':
      return <TrendingUp className="h-5 w-5 text-emerald-600" />;
    case 'analysis':
      return <BarChart3 className="h-5 w-5 text-teal-600" />;
    default:
      return <Activity className="h-5 w-5 text-purple-600" />;
  }
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

interface Insight {
  identity?: Array<{ label: string; value: string; subtext?: string }>;
  keyMetrics?: Array<{ label: string; value: string; description?: string; type?: string; change?: string }>;
  sections: Array<{
    title: string;
    type?: string;
    bullets?: string[];
    distribution?: Array<{ label: string; pct: number; count?: number }>;
    stats?: Array<{ label: string; value: string }>;
  }>;
  recommendations?: Array<{ title: string; description: string }>;
  warnings?: string[];
}

function generateInsights(snapshot: any, analytics: any, artifacts: any): Insight {
  const result: Insight = {
    identity: [],
    keyMetrics: [],
    sections: [],
    recommendations: [],
    warnings: [],
  };

  if (!snapshot) return result;

  // Extract identity info
  const identity = snapshot.identity?.identity || snapshot.identity || {};
  const diagnostics = snapshot.diagnostics || {};
  const rowCount = identity.row_count || diagnostics.row_count || 0;
  const colCount = identity.column_count || diagnostics.column_count || Object.keys(identity.columns || {}).length || 0;
  const dataQuality = diagnostics.data_quality_score ?? diagnostics.data_quality?.score ?? identity.quality_score ?? 0;

  // Build identity section
  if (rowCount > 0) {
    result.identity!.push({
      label: 'Total Records',
      value: formatNumber(rowCount),
      subtext: rowCount > 10000 ? 'Large dataset' : rowCount > 1000 ? 'Medium dataset' : 'Small dataset',
    });
  }

  if (colCount > 0) {
    result.identity!.push({
      label: 'Variables',
      value: colCount.toLocaleString(),
      subtext: `${colCount} attributes analyzed`,
    });
  }

  if (dataQuality > 0) {
    const qualityPct = (dataQuality * 100).toFixed(0);
    result.identity!.push({
      label: 'Data Quality',
      value: `${qualityPct}%`,
      subtext: dataQuality > 0.9 ? 'Excellent' : dataQuality > 0.7 ? 'Good' : dataQuality > 0.5 ? 'Fair' : 'Needs attention',
    });
  }

  // Completeness
  const completeness = identity.quality?.avg_null_pct != null
    ? 1 - identity.quality.avg_null_pct
    : snapshot.curated_kpis?.completeness;
  if (completeness != null && completeness > 0) {
    result.identity!.push({
      label: 'Completeness',
      value: `${(completeness * 100).toFixed(1)}%`,
      subtext: completeness > 0.95 ? 'Very complete' : completeness > 0.8 ? 'Mostly complete' : 'Has missing data',
    });
  }

  // Extract column-level insights
  const columns = identity.columns || snapshot.identity?.profile?.columns || {};
  const columnEntries = Object.entries(columns);

  if (columnEntries.length > 0) {
    // Find numeric columns for distribution analysis
    const numericCols = columnEntries.filter(([, col]: [string, any]) => {
      const dtype = col.dtype || col.type || '';
      return dtype.includes('int') || dtype.includes('float') || dtype.includes('numeric');
    });

    // Find categorical columns
    const categoricalCols = columnEntries.filter(([, col]: [string, any]) => {
      const dtype = col.dtype || col.type || '';
      return dtype.includes('object') || dtype.includes('string') || dtype.includes('category');
    });

    // Column type distribution
    result.sections.push({
      title: 'Column Types',
      type: 'distribution',
      distribution: [
        { label: 'Numeric', pct: (numericCols.length / columnEntries.length) * 100, count: numericCols.length },
        { label: 'Categorical', pct: (categoricalCols.length / columnEntries.length) * 100, count: categoricalCols.length },
        { label: 'Other', pct: ((columnEntries.length - numericCols.length - categoricalCols.length) / columnEntries.length) * 100, count: columnEntries.length - numericCols.length - categoricalCols.length },
      ].filter(d => d.count > 0),
    });

    // Find columns with high null percentage
    const highNullCols = columnEntries.filter(([, col]: [string, any]) => {
      return (col.null_pct || 0) > 0.2;
    });

    if (highNullCols.length > 0) {
      result.warnings!.push(
        `${highNullCols.length} column${highNullCols.length > 1 ? 's' : ''} have >20% missing values: ${highNullCols.slice(0, 3).map(([name]) => name).join(', ')}${highNullCols.length > 3 ? '...' : ''}`
      );
    }

    // Numeric column stats
    if (numericCols.length > 0) {
      const numericStats: Array<{ label: string; value: string }> = [];

      for (const [name, col] of numericCols.slice(0, 6) as [string, any][]) {
        if (col.min != null && col.max != null) {
          numericStats.push({
            label: name,
            value: `${Number(col.min).toFixed(2)} - ${Number(col.max).toFixed(2)}`,
          });
        } else if (col.mean != null) {
          numericStats.push({
            label: name,
            value: `avg: ${Number(col.mean).toFixed(2)}`,
          });
        }
      }

      if (numericStats.length > 0) {
        result.sections.push({
          title: 'Numeric Variable Ranges',
          type: 'analysis',
          stats: numericStats,
        });
      }
    }
  }

  // Enhanced analytics insights
  const enhancedAnalytics = analytics || snapshot.enhanced_analytics;
  if (enhancedAnalytics) {
    // Correlation insights
    const correlations = enhancedAnalytics.correlation_analysis?.strong_correlations || [];
    if (correlations.length > 0) {
      const corrBullets = correlations.slice(0, 5).map((c: any) => {
        const strength = Math.abs(c.correlation) > 0.7 ? 'Strong' : Math.abs(c.correlation) > 0.4 ? 'Moderate' : 'Weak';
        const direction = c.correlation > 0 ? 'positive' : 'negative';
        return `${strength} ${direction} relationship between "${c.column1}" and "${c.column2}" (r=${c.correlation.toFixed(2)})`;
      });

      result.sections.push({
        title: 'Key Relationships Found',
        type: 'analysis',
        bullets: corrBullets,
      });
    }

    // Distribution insights
    const distributions = enhancedAnalytics.distribution_analysis?.distributions;
    if (distributions && typeof distributions === 'object') {
      const distInsights: string[] = [];

      for (const [colName, dist] of Object.entries(distributions).slice(0, 5)) {
        const d = dist as any;
        if (d.skewness != null) {
          const skewType = d.skewness > 0.5 ? 'right-skewed' : d.skewness < -0.5 ? 'left-skewed' : 'roughly symmetric';
          distInsights.push(`"${colName}" is ${skewType} (skewness: ${d.skewness.toFixed(2)})`);
        }
      }

      if (distInsights.length > 0) {
        result.sections.push({
          title: 'Distribution Analysis',
          type: 'distribution',
          bullets: distInsights,
        });
      }
    }
  }

  // Model artifacts insights
  const modelArtifacts = artifacts || snapshot.model_artifacts;
  if (modelArtifacts) {
    const importance = modelArtifacts.importance_report?.features ||
                       modelArtifacts.feature_importance || [];

    if (Array.isArray(importance) && importance.length > 0) {
      const topFeatures = importance.slice(0, 5);
      const bullets = topFeatures.map((f: any, idx: number) => {
        const imp = typeof f.importance === 'number' ? f.importance : 0;
        return `#${idx + 1}: "${f.feature || f.name}" (importance: ${(imp * 100).toFixed(1)}%)`;
      });

      result.sections.push({
        title: 'Top Predictive Features',
        type: 'analysis',
        bullets,
      });
    }

    // Model fit metrics
    const modelFit = modelArtifacts.model_fit_report;
    if (modelFit?.metrics) {
      const metrics = modelFit.metrics;
      const stats: Array<{ label: string; value: string }> = [];

      if (metrics.r2 != null) {
        stats.push({ label: 'R² Score', value: `${(metrics.r2 * 100).toFixed(1)}%` });
      }
      if (metrics.accuracy != null) {
        stats.push({ label: 'Accuracy', value: `${(metrics.accuracy * 100).toFixed(1)}%` });
      }
      if (metrics.rmse != null) {
        stats.push({ label: 'RMSE', value: metrics.rmse.toFixed(3) });
      }
      if (metrics.mae != null) {
        stats.push({ label: 'MAE', value: metrics.mae.toFixed(3) });
      }

      if (stats.length > 0) {
        result.sections.push({
          title: 'Model Performance',
          type: 'analysis',
          stats,
        });

        // Add interpretation
        if (metrics.r2 != null) {
          const r2 = metrics.r2;
          if (r2 > 0.8) {
            result.keyMetrics!.push({
              label: 'Model Explains Most Variance',
              value: `${(r2 * 100).toFixed(0)}%`,
              description: 'The model captures most of the variation in the data',
              type: 'positive',
            });
          } else if (r2 > 0.5) {
            result.keyMetrics!.push({
              label: 'Model Has Moderate Fit',
              value: `${(r2 * 100).toFixed(0)}%`,
              description: 'The model explains about half the variation - consider additional features',
              type: 'neutral',
            });
          }
        }
      }
    }
  }

  // Generate recommendations based on insights
  if (rowCount < 100) {
    result.recommendations!.push({
      title: 'Consider Collecting More Data',
      description: `With only ${rowCount} records, statistical patterns may not be reliable. Consider gathering more samples for robust analysis.`,
    });
  }

  if (dataQuality < 0.7) {
    result.recommendations!.push({
      title: 'Address Data Quality Issues',
      description: 'Data quality score is below 70%. Review missing values and data consistency before drawing conclusions.',
    });
  }

  const highNullCount = Object.values(columns).filter((col: any) => (col.null_pct || 0) > 0.3).length;
  if (highNullCount > 0) {
    result.recommendations!.push({
      title: 'Handle Missing Data',
      description: `${highNullCount} columns have >30% missing values. Consider imputation strategies or excluding these from analysis.`,
    });
  }

  // If we have feature importance, suggest focusing on top drivers
  const topFeatures = modelArtifacts?.importance_report?.features || modelArtifacts?.feature_importance;
  if (Array.isArray(topFeatures) && topFeatures.length >= 3) {
    const top3 = topFeatures.slice(0, 3).map((f: any) => f.feature || f.name).filter(Boolean);
    if (top3.length > 0) {
      result.recommendations!.push({
        title: 'Focus on Key Drivers',
        description: `Top predictive variables are: ${top3.join(', ')}. Investigate these further to understand the underlying patterns.`,
      });
    }
  }

  // Trust-based recommendations
  const trust = snapshot.trust;
  if (trust) {
    const trustScore = trust.score ?? trust.trust_score;
    if (trustScore != null && trustScore < 0.5) {
      result.recommendations!.push({
        title: 'Validate Results Carefully',
        description: 'Trust score is low. Cross-reference findings with domain expertise before making decisions.',
      });
    }
  }

  return result;
}
