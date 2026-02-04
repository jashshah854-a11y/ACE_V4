/**
 * CSV Export utilities for ACE analytics data
 */

/**
 * Convert an array of objects to CSV string
 */
export function objectsToCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (!data || data.length === 0) return "";

  // Get all unique keys from all objects
  const allKeys = new Set<string>();
  data.forEach((obj) => {
    Object.keys(obj).forEach((key) => allKeys.add(key));
  });

  // Use provided columns or all keys
  const headers = columns || Array.from(allKeys);

  // Build CSV
  const lines: string[] = [];

  // Header row
  lines.push(headers.map(escapeCSVValue).join(","));

  // Data rows
  data.forEach((obj) => {
    const row = headers.map((header) => {
      const value = obj[header];
      return escapeCSVValue(formatValue(value));
    });
    lines.push(row.join(","));
  });

  return lines.join("\n");
}

/**
 * Convert a single object to CSV (key-value pairs)
 */
export function objectToCSV(data: Record<string, unknown>): string {
  if (!data || typeof data !== "object") return "";

  const lines: string[] = ["Key,Value"];

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value !== "object" || value === null) {
      lines.push(`${escapeCSVValue(key)},${escapeCSVValue(formatValue(value))}`);
    }
  });

  return lines.join("\n");
}

/**
 * Format a value for CSV export
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Format numbers with reasonable precision
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(6);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";
  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a CSV string as a file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export feature importance data
 */
export function exportFeatureImportance(
  features: Array<{ feature: string; importance: number; [key: string]: unknown }>,
  filename = "feature_importance.csv"
): void {
  const csv = objectsToCSV(
    features.map((f, idx) => ({
      rank: idx + 1,
      feature: f.feature,
      importance: f.importance,
    })),
    ["rank", "feature", "importance"]
  );
  downloadCSV(csv, filename);
}

/**
 * Export correlation data
 */
export function exportCorrelations(
  correlations: Array<{ feature1: string; feature2: string; pearson?: number; correlation?: number; [key: string]: unknown }>,
  filename = "correlations.csv"
): void {
  const csv = objectsToCSV(
    correlations.map((c) => ({
      feature_1: c.feature1,
      feature_2: c.feature2,
      correlation: c.pearson ?? c.correlation ?? 0,
    })),
    ["feature_1", "feature_2", "correlation"]
  );
  downloadCSV(csv, filename);
}

/**
 * Export distribution statistics
 */
export function exportDistributions(
  distributions: Record<string, {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    skewness: number;
    kurtosis: number;
    is_normal: boolean;
    distribution_type: string;
    outlier_count: number;
    outlier_percentage: number;
  }>,
  filename = "distribution_statistics.csv"
): void {
  const data = Object.entries(distributions).map(([feature, stats]) => ({
    feature,
    mean: stats.mean,
    median: stats.median,
    std_dev: stats.std,
    min: stats.min,
    max: stats.max,
    skewness: stats.skewness,
    kurtosis: stats.kurtosis,
    is_normal: stats.is_normal,
    distribution_type: stats.distribution_type,
    outlier_count: stats.outlier_count,
    outlier_percentage: stats.outlier_percentage,
  }));

  const csv = objectsToCSV(data, [
    "feature",
    "mean",
    "median",
    "std_dev",
    "min",
    "max",
    "skewness",
    "kurtosis",
    "is_normal",
    "distribution_type",
    "outlier_count",
    "outlier_percentage",
  ]);
  downloadCSV(csv, filename);
}

/**
 * Export column profile data
 */
export function exportColumnProfile(
  columns: Record<string, { dtype?: string; type?: string; null_pct?: number; [key: string]: unknown }>,
  filename = "column_profile.csv"
): void {
  const data = Object.entries(columns).map(([name, col]) => ({
    column_name: name,
    data_type: col.dtype || col.type || "unknown",
    null_percentage: col.null_pct != null ? (col.null_pct * 100).toFixed(2) + "%" : "",
    ...Object.fromEntries(
      Object.entries(col).filter(
        ([key]) => !["dtype", "type", "null_pct"].includes(key) && typeof col[key] !== "object"
      )
    ),
  }));

  const csv = objectsToCSV(data);
  downloadCSV(csv, filename);
}

/**
 * Export model metrics
 */
export function exportModelMetrics(
  metrics: Record<string, number>,
  baseline?: Record<string, number>,
  filename = "model_metrics.csv"
): void {
  const data = Object.entries(metrics).map(([metric, value]) => ({
    metric,
    value,
    baseline: baseline?.[metric] ?? "",
    improvement: baseline?.[metric] != null ? ((value - baseline[metric]) / baseline[metric] * 100).toFixed(2) + "%" : "",
  }));

  const csv = objectsToCSV(data, ["metric", "value", "baseline", "improvement"]);
  downloadCSV(csv, filename);
}

/**
 * Export business intelligence data
 */
export function exportBusinessIntelligence(
  bi: {
    value_metrics?: Record<string, unknown>;
    segment_value?: Array<{ segment: string; [key: string]: unknown }>;
    churn_risk?: { risk_distribution?: Array<{ risk_level: string; [key: string]: unknown }> };
    insights?: string[];
  },
  runId: string
): void {
  // Export value metrics
  if (bi.value_metrics) {
    const csv = objectToCSV(bi.value_metrics);
    downloadCSV(csv, `${runId}_value_metrics.csv`);
  }

  // Export segment value
  if (bi.segment_value && bi.segment_value.length > 0) {
    const csv = objectsToCSV(bi.segment_value);
    downloadCSV(csv, `${runId}_segment_value.csv`);
  }

  // Export churn risk distribution
  if (bi.churn_risk?.risk_distribution) {
    const csv = objectsToCSV(bi.churn_risk.risk_distribution);
    downloadCSV(csv, `${runId}_churn_risk.csv`);
  }
}

/**
 * Export full snapshot as JSON (for complete data export)
 */
export function exportSnapshotJSON(snapshot: Record<string, unknown>, filename = "analysis_snapshot.json"): void {
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
