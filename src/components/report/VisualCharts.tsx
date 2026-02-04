import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { ChevronDown, ChevronUp, BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";

interface VisualChartsProps {
  snapshot: any;
  analytics?: any;
  artifacts?: any;
}

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
];

/**
 * VisualCharts - Actual visual charts (bar, pie, line) for data visualization
 */
export function VisualCharts({ snapshot, analytics, artifacts }: VisualChartsProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>("distribution");

  const chartData = useMemo(() => generateChartData(snapshot, analytics, artifacts), [snapshot, analytics, artifacts]);

  if (!chartData || chartData.charts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {chartData.charts.map((chart) => (
        <div key={chart.id} className="rounded-2xl border bg-card overflow-hidden">
          <button
            onClick={() => setExpandedChart(expandedChart === chart.id ? null : chart.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ChartIcon type={chart.type} />
              <div className="text-left">
                <h3 className="font-semibold">{chart.title}</h3>
                {chart.subtitle && (
                  <p className="text-sm text-muted-foreground">{chart.subtitle}</p>
                )}
              </div>
            </div>
            {expandedChart === chart.id ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {expandedChart === chart.id && (
            <div className="p-4 pt-0">
              {chart.type === "bar" && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                        className="fill-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chart.type === "horizontalBar" && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chart.data}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 80, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        width={75}
                        className="fill-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chart.type === "pie" && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chart.data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chart.data.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chart.type === "area" && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {chart.type === "multiBar" && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      {chart.keys?.map((key, idx) => (
                        <Bar key={key} dataKey={key} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart insights */}
              {chart.insights && chart.insights.length > 0 && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Insights</p>
                  <ul className="space-y-1">
                    {chart.insights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChartIcon({ type }: { type: string }) {
  switch (type) {
    case "pie":
      return <PieIcon className="h-5 w-5 text-fuchsia-600" />;
    case "area":
    case "line":
      return <TrendingUp className="h-5 w-5 text-emerald-600" />;
    default:
      return <BarChart3 className="h-5 w-5 text-indigo-600" />;
  }
}

interface ChartData {
  id: string;
  title: string;
  subtitle?: string;
  type: "bar" | "horizontalBar" | "pie" | "area" | "multiBar" | "line";
  data: Array<{ name: string; value: number; [key: string]: any }>;
  keys?: string[];
  insights?: string[];
}

function generateChartData(snapshot: any, analytics: any, artifacts: any): { charts: ChartData[] } {
  const charts: ChartData[] = [];

  if (!snapshot) return { charts };

  const identity = snapshot.identity?.identity || snapshot.identity || {};
  const columns = identity.columns || snapshot.identity?.profile?.columns || {};
  const columnEntries = Object.entries(columns);

  // 1. Column Type Distribution (Pie Chart)
  if (columnEntries.length > 0) {
    const numericCount = columnEntries.filter(([, col]: [string, any]) => {
      const dtype = (col.dtype || col.type || "").toLowerCase();
      return dtype.includes("int") || dtype.includes("float") || dtype.includes("numeric");
    }).length;

    const textCount = columnEntries.filter(([, col]: [string, any]) => {
      const dtype = (col.dtype || col.type || "").toLowerCase();
      return dtype.includes("object") || dtype.includes("string") || dtype.includes("category");
    }).length;

    const otherCount = columnEntries.length - numericCount - textCount;

    if (numericCount > 0 || textCount > 0) {
      charts.push({
        id: "column-types",
        title: "Column Type Distribution",
        subtitle: `${columnEntries.length} total columns analyzed`,
        type: "pie",
        data: [
          { name: "Numeric", value: numericCount },
          { name: "Text/Category", value: textCount },
          ...(otherCount > 0 ? [{ name: "Other", value: otherCount }] : []),
        ].filter((d) => d.value > 0),
        insights: [
          numericCount > textCount
            ? "Dataset is primarily numeric - suitable for statistical modeling"
            : "Dataset has significant categorical data - consider encoding strategies",
        ],
      });
    }
  }

  // 2. Missing Data by Column (Horizontal Bar)
  const columnsWithNulls = columnEntries
    .filter(([, col]: [string, any]) => (col.null_pct || 0) > 0.01)
    .map(([name, col]: [string, any]) => ({
      name: name.length > 15 ? name.slice(0, 12) + "..." : name,
      value: Math.round((col.null_pct || 0) * 100),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (columnsWithNulls.length > 0) {
    const highMissing = columnsWithNulls.filter((c) => c.value > 20);
    charts.push({
      id: "missing-data",
      title: "Missing Data by Column",
      subtitle: `Top ${columnsWithNulls.length} columns with missing values`,
      type: "horizontalBar",
      data: columnsWithNulls,
      insights: [
        highMissing.length > 0
          ? `${highMissing.length} column(s) have >20% missing data - consider imputation`
          : "Missing data levels are manageable across all columns",
      ],
    });
  }

  // 3. Numeric Variable Ranges (Bar Chart)
  const numericCols = columnEntries
    .filter(([, col]: [string, any]) => {
      const dtype = (col.dtype || col.type || "").toLowerCase();
      return (dtype.includes("int") || dtype.includes("float")) && col.mean != null;
    })
    .map(([name, col]: [string, any]) => ({
      name: name.length > 12 ? name.slice(0, 10) + ".." : name,
      value: Number(col.mean) || 0,
      min: col.min,
      max: col.max,
    }))
    .slice(0, 8);

  if (numericCols.length > 0) {
    charts.push({
      id: "numeric-means",
      title: "Numeric Variable Averages",
      subtitle: "Mean values of numeric columns",
      type: "bar",
      data: numericCols,
    });
  }

  // 4. Feature Importance (Horizontal Bar) - if model artifacts available
  const featureImportance =
    artifacts?.importance_report?.features ||
    artifacts?.feature_importance ||
    snapshot?.model_artifacts?.importance_report?.features ||
    snapshot?.model_artifacts?.feature_importance;

  if (Array.isArray(featureImportance) && featureImportance.length > 0) {
    const topFeatures = featureImportance
      .slice(0, 10)
      .map((f: any) => ({
        name: (f.feature || f.name || "").length > 15
          ? (f.feature || f.name || "").slice(0, 12) + "..."
          : (f.feature || f.name || ""),
        value: Math.abs(Number(f.importance) || 0) * 100,
      }))
      .filter((f) => f.value > 0);

    if (topFeatures.length > 0) {
      charts.push({
        id: "feature-importance",
        title: "Top Predictive Features",
        subtitle: "Feature importance scores from model analysis",
        type: "horizontalBar",
        data: topFeatures,
        insights: [
          `"${topFeatures[0]?.name}" is the strongest predictor`,
          topFeatures.length >= 3
            ? `Top 3 features account for most predictive power`
            : undefined,
        ].filter(Boolean) as string[],
      });
    }
  }

  // 5. Correlation Strengths (Bar Chart)
  const correlations =
    analytics?.correlation_analysis?.strong_correlations ||
    snapshot?.enhanced_analytics?.correlation_analysis?.strong_correlations;

  if (Array.isArray(correlations) && correlations.length > 0) {
    const corrData = correlations.slice(0, 8).map((c: any) => ({
      name: `${(c.column1 || "").slice(0, 6)}-${(c.column2 || "").slice(0, 6)}`,
      value: Math.abs(c.correlation || 0),
      direction: (c.correlation || 0) > 0 ? "positive" : "negative",
    }));

    charts.push({
      id: "correlations",
      title: "Strong Correlations",
      subtitle: "Variable pairs with significant relationships",
      type: "bar",
      data: corrData,
      insights: correlations.slice(0, 2).map((c: any) => {
        const strength = Math.abs(c.correlation) > 0.7 ? "strong" : "moderate";
        const dir = c.correlation > 0 ? "positive" : "negative";
        return `${c.column1} and ${c.column2} have a ${strength} ${dir} relationship (r=${c.correlation.toFixed(2)})`;
      }),
    });
  }

  // 6. Distribution Skewness (if available)
  const distributions =
    analytics?.distribution_analysis?.distributions ||
    snapshot?.enhanced_analytics?.distribution_analysis?.distributions;

  if (distributions && typeof distributions === "object") {
    const skewData = Object.entries(distributions)
      .filter(([, d]: [string, any]) => d.skewness != null)
      .map(([name, d]: [string, any]) => ({
        name: name.length > 12 ? name.slice(0, 10) + ".." : name,
        value: Number(d.skewness) || 0,
      }))
      .slice(0, 8);

    if (skewData.length > 0) {
      const highlySkewed = skewData.filter((d) => Math.abs(d.value) > 1);
      charts.push({
        id: "skewness",
        title: "Distribution Skewness",
        subtitle: "How asymmetric each variable's distribution is",
        type: "bar",
        data: skewData,
        insights: [
          highlySkewed.length > 0
            ? `${highlySkewed.length} variable(s) are highly skewed - may need transformation`
            : "Distributions are relatively symmetric",
        ],
      });
    }
  }

  return { charts };
}
