import { useParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft, Download, FileJson, FileSpreadsheet, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRunSnapshot, useEnhancedAnalytics, useModelArtifacts } from "@/lib/queries";
import { CuratedKpiPanel } from "@/components/report/story/CuratedKpiPanel";
import { RunWarningsBanner } from "@/components/report/RunWarningsBanner";
import { DatasetIdentityCard } from "@/components/upload/DatasetIdentityCard";
import type { DatasetIdentity } from "@/lib/api-client";
import { CorrelationInsightsCard } from "@/components/report/analytics/CorrelationInsightsCard";
import { TopDriversCard } from "@/components/report/analytics/TopDriversCard";
import { DistributionCharts } from "@/components/report/DistributionCharts";
import { BusinessIntelligenceDashboard } from "@/components/report/BusinessIntelligenceDashboard";
import { RunMonitoringPanel } from "@/components/report/RunMonitoringPanel";
import type { CuratedKpiCardData } from "@/types/reportTypes";
import {
  exportFeatureImportance,
  exportCorrelations,
  exportDistributions,
  exportColumnProfile,
  exportModelMetrics,
  exportBusinessIntelligence,
  exportSnapshotJSON,
} from "@/lib/csv-export";

export default function ReportDashboard() {
  const { runId } = useParams<{ runId: string }>();
  const { data: snapshot, isLoading, error } = useRunSnapshot(runId, false);
  const { data: enhancedAnalytics } = useEnhancedAnalytics(runId);
  const { data: modelArtifacts } = useModelArtifacts(runId);

  if (isLoading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading report...</p>
        </div>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Error Loading Report</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Report not found"}
          </p>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Merge analytics from snapshot and separate endpoint
  const rawAnalytics = snapshot.enhanced_analytics || enhancedAnalytics;
  const rawArtifacts = snapshot.model_artifacts || modelArtifacts;

  // Normalize artifacts to pass isValidArtifact checks (add valid/status fields)
  const artifacts = normalizeArtifacts(rawArtifacts);
  const analytics = normalizeAnalytics(rawAnalytics);
  const bi = analytics?.business_intelligence;

  // Build KPI cards from snapshot.curated_kpis
  const kpiCards = buildKpiCards(snapshot);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Reports
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <ExportDropdown
            runId={runId || "export"}
            snapshot={snapshot}
            analytics={analytics}
            artifacts={artifacts}
            rawArtifacts={rawArtifacts}
          />
          <code className="text-xs text-muted-foreground font-mono">
            {runId?.slice(0, 8)}
          </code>
        </div>
      </div>

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="summary">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="profile">Data Profile</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bi">Business Intelligence</TabsTrigger>
          <TabsTrigger value="report">Full Report</TabsTrigger>
        </TabsList>

        {/* Tab 1: Executive Summary */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          {snapshot.run_warnings && snapshot.run_warnings.length > 0 && (
            <RunWarningsBanner warnings={snapshot.run_warnings} />
          )}

          {kpiCards.length > 0 && <CuratedKpiPanel kpis={kpiCards} />}

          {/* Trust Summary */}
          {snapshot.trust && (
            <TrustSummary trust={snapshot.trust} />
          )}

          {/* Diagnostics Summary */}
          {snapshot.diagnostics && (
            <DiagnosticsSummary diagnostics={snapshot.diagnostics} />
          )}

          {/* Identity Summary */}
          {snapshot.identity?.summary && (
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold mb-2">Dataset Summary</h3>
              {typeof snapshot.identity.summary === "string" ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {snapshot.identity.summary}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {Object.entries(snapshot.identity.summary)
                    .filter(([, v]) => v != null && typeof v !== "object")
                    .map(([key, value]) => (
                      <div key={key}>
                        <p className="text-muted-foreground text-xs">
                          {key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                        <p className="font-medium">
                          {typeof value === "number" && value < 1 && value > 0
                            ? `${(value * 100).toFixed(1)}%`
                            : typeof value === "boolean"
                              ? value ? "Yes" : "No"
                              : String(value)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Data Profile */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          {snapshot.identity?.identity && (
            <DatasetIdentityCard identity={adaptSnapshotIdentity(snapshot.identity.identity)} />
          )}

          {(snapshot.identity?.identity?.columns || snapshot.identity?.profile?.columns) && (
            <ColumnProfileTable columns={snapshot.identity.identity?.columns || snapshot.identity.profile.columns} />
          )}

          {snapshot.diagnostics?.data_quality && (
            <QualityMetrics quality={snapshot.diagnostics.data_quality} />
          )}
        </TabsContent>

        {/* Tab: Insights (Performance + Recommendations) */}
        <TabsContent value="insights" className="space-y-6 mt-6">
          {runId && <RunMonitoringPanel runId={runId} />}
        </TabsContent>

        {/* Tab 3: Analytics */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <CorrelationInsightsCard
            data={analytics?.correlation_analysis}
            correlationCi={analytics?.correlation_ci}
          />

          <TopDriversCard
            importanceReport={artifacts?.importance_report}
            modelFitReport={artifacts?.model_fit_report}
            collinearityReport={artifacts?.collinearity_report}
          />

          {/* Fallback: show raw feature importance if TopDriversCard returns null */}
          {!artifacts?.importance_report?.features?.length && rawArtifacts?.feature_importance && (
            <FeatureImportanceFallback data={rawArtifacts.feature_importance} />
          )}

          {/* Fallback: show raw importance_report if it has different shape */}
          {!artifacts?.importance_report?.features?.length && rawArtifacts?.importance_report && (
            <ImportanceReportFallback data={rawArtifacts.importance_report} />
          )}

          {analytics?.distribution_analysis?.distributions && (
            <DistributionCharts
              distributions={analytics.distribution_analysis.distributions}
              insights={analytics.distribution_analysis?.insights}
            />
          )}

          {/* Model fit summary if available */}
          {(artifacts?.model_fit_report || rawArtifacts?.model_fit_report) && (
            <ModelFitSummary data={artifacts?.model_fit_report || rawArtifacts?.model_fit_report} />
          )}

          {!analytics?.correlation_analysis?.strong_correlations?.length &&
           !artifacts?.importance_report?.features?.length &&
           !rawArtifacts?.feature_importance &&
           !rawArtifacts?.importance_report &&
           !analytics?.distribution_analysis?.distributions && (
            <EmptyTab message="No analytics data available for this run." />
          )}
        </TabsContent>

        {/* Tab 4: Business Intelligence */}
        <TabsContent value="bi" className="space-y-6 mt-6">
          {bi ? (
            <BusinessIntelligenceDashboard
              valueMetrics={bi.value_metrics}
              clvProxy={bi.clv_proxy}
              segmentValue={bi.segment_value}
              churnRisk={bi.churn_risk}
              insights={bi.insights}
            />
          ) : (
            <EmptyTab message="No business intelligence data available for this run." />
          )}
        </TabsContent>

        {/* Tab 5: Full Report */}
        <TabsContent value="report" className="mt-6">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              {snapshot.report_markdown ? (
                <div className="rounded-2xl border bg-card p-8">
                  <article className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown>{snapshot.report_markdown}</ReactMarkdown>
                  </article>
                </div>
              ) : (
                <EmptyTab message="Full report not yet available. The analysis may still be processing." />
              )}
            </div>

            {/* Evidence sidebar */}
            {snapshot.evidence_map && !Array.isArray(snapshot.evidence_map) && typeof snapshot.evidence_map === "object" && Object.keys(snapshot.evidence_map).length > 0 && (
              <aside className="hidden lg:block w-72 shrink-0">
                <div className="sticky top-20 rounded-2xl border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Evidence Map</h4>
                  {Object.entries(snapshot.evidence_map).map(([key, value]) => (
                    <div key={key} className="text-xs space-y-1">
                      <p className="font-medium text-foreground">{key}</p>
                      <p className="text-muted-foreground truncate">
                        {typeof value === "string" ? value : JSON.stringify(value).slice(0, 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

// --- Helper components ---

function TrustSummary({ trust }: { trust: any }) {
  if (!trust) return null;
  const score = trust.score ?? trust.trust_score;
  const level = trust.level ?? trust.trust_level;
  if (score == null && !level) return null;

  const color =
    score > 0.7 ? "text-emerald-600" : score > 0.4 ? "text-amber-600" : "text-rose-600";

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Trust Assessment
      </h3>
      <div className="flex items-baseline gap-3">
        {score != null && (
          <span className={`text-4xl font-bold ${color}`}>
            {(score * 100).toFixed(0)}%
          </span>
        )}
        {level && (
          <span className="text-sm font-medium text-muted-foreground capitalize">
            {level}
          </span>
        )}
      </div>
      {trust.reasons && Array.isArray(trust.reasons) && trust.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {trust.reasons.slice(0, 3).map((r: string, i: number) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiagnosticsSummary({ diagnostics }: { diagnostics: any }) {
  if (!diagnostics) return null;

  const mode = diagnostics.mode || diagnostics.analysis_mode;
  const quality = diagnostics.data_quality_score ?? diagnostics.data_quality?.score ?? diagnostics.data_quality?.overall_score;
  const target = diagnostics.target_candidate;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Diagnostics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        {mode && (
          <div>
            <p className="text-muted-foreground text-xs">Analysis Mode</p>
            <p className="font-medium capitalize">{mode}</p>
          </div>
        )}
        {quality != null && (
          <div>
            <p className="text-muted-foreground text-xs">Data Quality</p>
            <p className="font-medium">
              {typeof quality === "number" ? `${(quality * 100).toFixed(0)}%` : String(quality)}
            </p>
          </div>
        )}
        {target?.column && (
          <div>
            <p className="text-muted-foreground text-xs">Target Variable</p>
            <p className="font-medium font-mono text-xs">{target.column}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnProfileTable({ columns }: { columns: Record<string, any> }) {
  const entries = Object.entries(columns);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Column Profile</h3>
        <p className="text-xs text-muted-foreground">{entries.length} columns detected</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2 font-medium">Column</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-right px-4 py-2 font-medium">Null %</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, col]) => (
              <tr key={name} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-4 py-2 font-mono text-xs">{name}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {col.dtype || col.type || "unknown"}
                </td>
                <td className="px-4 py-2 text-right text-muted-foreground">
                  {col.null_pct != null ? `${(col.null_pct * 100).toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityMetrics({ quality }: { quality: any }) {
  if (!quality || typeof quality !== "object") return null;

  const metrics = Object.entries(quality).filter(
    ([, v]) => typeof v === "number" || typeof v === "string"
  );
  if (metrics.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Data Quality Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map(([key, value]) => (
          <div key={key} className="text-sm">
            <p className="text-muted-foreground text-xs">
              {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
            <p className="font-medium">
              {typeof value === "number"
                ? value <= 1 ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)
                : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border bg-card p-12 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Adapt the snapshot's identity object to the DatasetIdentity shape
 * that DatasetIdentityCard expects. The snapshot stores a richer format
 * with `columns` (object), `capabilities`, etc. while the component
 * expects `schema_map` (array), `detected_capabilities`, `file_type`, `warnings`.
 */
function adaptSnapshotIdentity(raw: any): DatasetIdentity {
  // Build schema_map array from columns object
  const columns = raw.columns || {};
  const schemaMap = Object.entries(columns).slice(0, 10).map(([name, col]: [string, any]) => ({
    name,
    type: col.dtype || col.type || "unknown",
    sample: col.min != null ? String(col.min) : "",
  }));

  return {
    row_count: raw.row_count || 0,
    column_count: raw.column_count || Object.keys(columns).length,
    file_type: raw.data_type?.primary_type || "unknown",
    schema_map: schemaMap,
    quality_score: raw.quality_score ?? (raw.quality?.avg_null_pct != null ? 1 - raw.quality.avg_null_pct : 0.5),
    critical_gaps: [],
    detected_capabilities: raw.capabilities || raw.detected_capabilities || {},
    warnings: [],
  };
}

function buildKpiCards(snapshot: any): CuratedKpiCardData[] {
  // If snapshot has explicit curated_kpis array, use it
  if (Array.isArray(snapshot.curated_kpis)) {
    return snapshot.curated_kpis;
  }

  // Build fallback cards from the curated_kpis object
  const kpis = snapshot.curated_kpis;
  if (!kpis || typeof kpis !== "object") return [];

  const cards: CuratedKpiCardData[] = [];

  if (kpis.rows != null) {
    cards.push({
      id: "rows",
      label: "Rows",
      value: String(kpis.rows),
      status: "neutral",
      trend: "flat",
      origin: "fallback",
    });
  }
  if (kpis.columns != null) {
    cards.push({
      id: "columns",
      label: "Columns",
      value: String(kpis.columns),
      status: "neutral",
      trend: "flat",
      origin: "fallback",
    });
  }
  if (kpis.data_quality_score != null) {
    const score = Number(kpis.data_quality_score);
    cards.push({
      id: "quality",
      label: "Data Quality",
      value: `${(score * 100).toFixed(0)}%`,
      status: score > 0.7 ? "success" : score > 0.5 ? "warning" : "risk",
      trend: "flat",
      origin: "fallback",
    });
  }
  if (kpis.completeness != null) {
    const comp = Number(kpis.completeness);
    // Skip showing completeness if it's basically zero (misleading)
    // or if it's very close to 1 (redundant with quality score)
    if (comp > 0.01 && comp < 0.999) {
      cards.push({
        id: "completeness",
        label: "Completeness",
        value: `${(comp * 100).toFixed(1)}%`,
        status: comp > 0.9 ? "success" : comp > 0.7 ? "warning" : "risk",
        trend: "flat",
        origin: "fallback",
      });
    }
  }

  return cards;
}

/**
 * Normalize model artifacts to include valid/status fields
 * so the existing TopDriversCard etc. components work
 */
function normalizeArtifacts(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const normalized: any = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      normalized[key] = {
        ...value,
        valid: (value as any).valid ?? true,
        status: (value as any).status ?? "success",
      };
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}

/**
 * Normalize analytics data to include valid/status fields
 */
function normalizeAnalytics(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const normalized: any = { ...raw };

  // Normalize correlation_analysis
  if (raw.correlation_analysis && typeof raw.correlation_analysis === "object") {
    normalized.correlation_analysis = {
      ...raw.correlation_analysis,
      valid: raw.correlation_analysis.valid ?? true,
      status: raw.correlation_analysis.status ?? "success",
      available: raw.correlation_analysis.available ?? true,
    };
  }

  // Normalize distribution_analysis
  if (raw.distribution_analysis && typeof raw.distribution_analysis === "object") {
    normalized.distribution_analysis = {
      ...raw.distribution_analysis,
      valid: raw.distribution_analysis.valid ?? true,
      status: raw.distribution_analysis.status ?? "success",
      available: raw.distribution_analysis.available ?? true,
    };
  }

  // Normalize business_intelligence
  if (raw.business_intelligence && typeof raw.business_intelligence === "object") {
    normalized.business_intelligence = {
      ...raw.business_intelligence,
      valid: raw.business_intelligence.valid ?? true,
      status: raw.business_intelligence.status ?? "success",
      available: raw.business_intelligence.available ?? true,
    };
  }

  return normalized;
}

/**
 * Fallback component for feature_importance when TopDriversCard can't render
 */
function FeatureImportanceFallback({ data }: { data: any }) {
  // Handle array of {feature, importance} or object with feature_importance array
  const features = Array.isArray(data)
    ? data
    : Array.isArray(data?.feature_importance)
      ? data.feature_importance
      : null;

  if (!features || features.length === 0) return null;

  const maxImportance = Math.max(...features.map((f: any) => Math.abs(Number(f.importance) || 0))) || 1;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Feature Importance</h3>
      <div className="space-y-3">
        {features.slice(0, 8).map((item: any, idx: number) => {
          const value = Math.abs(Number(item.importance) || 0);
          const pct = Math.max(2, Math.round((value / maxImportance) * 100));
          return (
            <div key={item.feature || idx}>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-foreground">{item.feature}</span>
                <span>{value.toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {features.length > 8 && (
        <p className="text-xs text-muted-foreground mt-3">Showing top 8 of {features.length} features</p>
      )}
    </div>
  );
}

/**
 * Fallback for importance_report with different structure
 */
function ImportanceReportFallback({ data }: { data: any }) {
  if (!data) return null;

  // Try to extract features array from various possible shapes
  const features = data.features || data.feature_importance || data.importances;
  if (!Array.isArray(features) || features.length === 0) {
    // Maybe it's a flat object with feature names as keys
    if (typeof data === "object" && !Array.isArray(data)) {
      const entries = Object.entries(data).filter(
        ([key, val]) => typeof val === "number" && !["valid", "status"].includes(key)
      );
      if (entries.length > 0) {
        const maxVal = Math.max(...entries.map(([, v]) => Math.abs(Number(v)))) || 1;
        return (
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-4">Model Importance Scores</h3>
            <div className="space-y-3">
              {entries.slice(0, 8).map(([key, value]) => {
                const numVal = Math.abs(Number(value));
                const pct = Math.max(2, Math.round((numVal / maxVal) * 100));
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">{key}</span>
                      <span>{numVal.toFixed(2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    }
    return null;
  }

  return <FeatureImportanceFallback data={features} />;
}

/**
 * Model fit summary card
 */
function ModelFitSummary({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;

  const metrics = data.metrics || {};
  const baseline = data.baseline_metrics || {};
  const targetCol = data.target_column;
  const model = data.model;

  const metricEntries = Object.entries(metrics).filter(
    ([, v]) => typeof v === "number"
  );

  if (metricEntries.length === 0 && !targetCol && !model) return null;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="font-semibold mb-4">Model Performance</h3>
      {(targetCol || model) && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          {targetCol && (
            <div>
              <span className="text-muted-foreground">Target: </span>
              <span className="font-mono">{targetCol}</span>
            </div>
          )}
          {model && (
            <div>
              <span className="text-muted-foreground">Model: </span>
              <span className="font-medium">{model}</span>
            </div>
          )}
        </div>
      )}
      {metricEntries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metricEntries.map(([key, value]) => {
            const baselineVal = baseline[key];
            return (
              <div key={key} className="text-sm">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="font-semibold text-lg">
                  {typeof value === "number" && value <= 1 && value >= 0
                    ? `${(value * 100).toFixed(1)}%`
                    : Number(value).toFixed(3)}
                </p>
                {baselineVal != null && (
                  <p className="text-xs text-muted-foreground">
                    baseline: {typeof baselineVal === "number" && baselineVal <= 1 && baselineVal >= 0
                      ? `${(baselineVal * 100).toFixed(1)}%`
                      : Number(baselineVal).toFixed(3)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Export dropdown menu component
 */
function ExportDropdown({
  runId,
  snapshot,
  analytics,
  artifacts,
  rawArtifacts,
}: {
  runId: string;
  snapshot: any;
  analytics: any;
  artifacts: any;
  rawArtifacts: any;
}) {
  const hasFeatureImportance =
    artifacts?.importance_report?.features?.length > 0 ||
    rawArtifacts?.feature_importance?.length > 0 ||
    rawArtifacts?.importance_report?.features?.length > 0;

  const hasCorrelations =
    analytics?.correlation_analysis?.strong_correlations?.length > 0;

  const hasDistributions =
    analytics?.distribution_analysis?.distributions &&
    Object.keys(analytics.distribution_analysis.distributions).length > 0;

  const hasColumns =
    snapshot?.identity?.identity?.columns ||
    snapshot?.identity?.profile?.columns;

  const hasModelMetrics =
    artifacts?.model_fit_report?.metrics ||
    rawArtifacts?.model_fit_report?.metrics;

  const hasBI = analytics?.business_intelligence;

  const handleExportFeatures = () => {
    const features =
      artifacts?.importance_report?.features ||
      rawArtifacts?.feature_importance ||
      rawArtifacts?.importance_report?.features ||
      [];
    if (features.length > 0) {
      exportFeatureImportance(features, `${runId}_feature_importance.csv`);
    }
  };

  const handleExportCorrelations = () => {
    const correlations = analytics?.correlation_analysis?.strong_correlations || [];
    if (correlations.length > 0) {
      exportCorrelations(correlations, `${runId}_correlations.csv`);
    }
  };

  const handleExportDistributions = () => {
    const distributions = analytics?.distribution_analysis?.distributions;
    if (distributions) {
      exportDistributions(distributions, `${runId}_distributions.csv`);
    }
  };

  const handleExportColumns = () => {
    const columns =
      snapshot?.identity?.identity?.columns ||
      snapshot?.identity?.profile?.columns;
    if (columns) {
      exportColumnProfile(columns, `${runId}_column_profile.csv`);
    }
  };

  const handleExportModelMetrics = () => {
    const data = artifacts?.model_fit_report || rawArtifacts?.model_fit_report;
    if (data?.metrics) {
      exportModelMetrics(data.metrics, data.baseline_metrics, `${runId}_model_metrics.csv`);
    }
  };

  const handleExportBI = () => {
    if (hasBI) {
      exportBusinessIntelligence(analytics.business_intelligence, runId);
    }
  };

  const handleExportFullJSON = () => {
    exportSnapshotJSON(snapshot, `${runId}_full_snapshot.json`);
  };

  const handleExportMarkdown = () => {
    if (snapshot?.report_markdown) {
      const blob = new Blob([snapshot.report_markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${runId}_report.md`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const hasAnyExport =
    hasFeatureImportance ||
    hasCorrelations ||
    hasDistributions ||
    hasColumns ||
    hasModelMetrics ||
    hasBI ||
    snapshot?.report_markdown;

  if (!hasAnyExport) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
          <ChevronDown className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {hasFeatureImportance && (
          <DropdownMenuItem onClick={handleExportFeatures}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Feature Importance (CSV)
          </DropdownMenuItem>
        )}
        {hasCorrelations && (
          <DropdownMenuItem onClick={handleExportCorrelations}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Correlations (CSV)
          </DropdownMenuItem>
        )}
        {hasDistributions && (
          <DropdownMenuItem onClick={handleExportDistributions}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Distribution Stats (CSV)
          </DropdownMenuItem>
        )}
        {hasColumns && (
          <DropdownMenuItem onClick={handleExportColumns}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Column Profile (CSV)
          </DropdownMenuItem>
        )}
        {hasModelMetrics && (
          <DropdownMenuItem onClick={handleExportModelMetrics}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Model Metrics (CSV)
          </DropdownMenuItem>
        )}
        {hasBI && (
          <DropdownMenuItem onClick={handleExportBI}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Business Intelligence (CSV)
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {snapshot?.report_markdown && (
          <DropdownMenuItem onClick={handleExportMarkdown}>
            <Download className="mr-2 h-4 w-4" />
            Full Report (Markdown)
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleExportFullJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          Full Snapshot (JSON)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
