import { useMemo } from "react";
import { useRemoteArtifact } from "@/hooks/useRemoteArtifact";
import type { CuratedKpiArtifact, CuratedKpiArtifactEntry, CuratedKpiCardData } from "@/types/reportTypes";

const KPI_ENDPOINT = "artifacts/kpi_summary";

type KpiFallbackSource = {
  confidenceValue?: number;
  dataQualityValue?: number;
  identityStats?: { rows?: number | string } | null;
  metrics?: Record<string, any>;
  personas?: Array<unknown>;
  clusterMetrics?: { clusters?: Array<unknown> } | null;
};

interface CuratedKpiHookResult {
  kpis: CuratedKpiCardData[];
  loading: boolean;
  error: string | null;
  hasRemoteData: boolean;
  sourceLabel?: string;
}

export function useCuratedKpis(runId?: string, fallbackSource?: KpiFallbackSource): CuratedKpiHookResult {
  const { data, loading, error } = useRemoteArtifact<CuratedKpiArtifact>(runId, KPI_ENDPOINT);

  const artifactCards = useMemo(() => normalizeArtifactKpis(data), [data]);

  const fallbackDeps = [
    fallbackSource?.confidenceValue,
    fallbackSource?.dataQualityValue,
    fallbackSource?.identityStats?.rows,
    fallbackSource?.metrics?.recordsProcessed,
    fallbackSource?.personas?.length,
    fallbackSource?.clusterMetrics?.clusters?.length,
  ];

  const fallbackCards = useMemo(() => buildFallbackKpis(fallbackSource), fallbackDeps);

  const kpis = artifactCards.length ? artifactCards : fallbackCards;
  const hasRemoteData = artifactCards.length > 0;
  const sourceLabel = hasRemoteData
    ? "Governed KPI artifact"
    : fallbackCards.length
      ? "Derived from diagnostics"
      : undefined;

  return {
    kpis,
    loading,
    error,
    hasRemoteData,
    sourceLabel,
  };
}

function normalizeArtifactKpis(payload?: CuratedKpiArtifact | null): CuratedKpiCardData[] {
  if (!payload) return [];
  const candidates = payload.primary?.length
    ? payload.primary
    : payload.kpis?.length
      ? payload.kpis
      : payload.supporting ?? [];

  return candidates
    .filter((entry): entry is CuratedKpiArtifactEntry => Boolean(entry && (entry.label || entry.display_value)))
    .map((entry, index) => {
      const value = entry.display_value ?? formatValue(entry.value, entry.unit, entry.format);
      return {
        id: entry.id || `artifact-kpi-${index}`,
        label: entry.label,
        value: value ?? "—",
        status: entry.status,
        trend: entry.trend ?? deriveTrend(entry.delta_pct ?? entry.delta_value),
        deltaLabel: entry.delta_label ?? formatDelta(entry.delta_pct, entry.delta_value, entry.unit),
        description: entry.description,
        confidenceLabel: formatConfidence(entry.confidence),
        sourceColumns: entry.source_columns,
        origin: "artifact" as const,
      };
    })
    .filter((entry) => Boolean(entry.value));
}

function buildFallbackKpis(source?: KpiFallbackSource): CuratedKpiCardData[] {
  if (!source) return [];
  const entries: CuratedKpiCardData[] = [];

  if (typeof source.confidenceValue === "number" && !Number.isNaN(source.confidenceValue)) {
    entries.push({
      id: "fallback-confidence",
      label: "AI Confidence",
      value: `${Math.round(source.confidenceValue)}%`,
      status: source.confidenceValue >= 80 ? "success" : source.confidenceValue >= 50 ? "warning" : "risk",
      trend: source.confidenceValue >= 80 ? "up" : source.confidenceValue >= 50 ? "flat" : "down",
      description: source.confidenceValue >= 80 ? "Models validated" : "Governance review recommended",
      origin: "fallback",
    });
  }

  if (typeof source.dataQualityValue === "number" && !Number.isNaN(source.dataQualityValue)) {
    entries.push({
      id: "fallback-quality",
      label: "Data Clarity",
      value: `${Math.round(source.dataQualityValue)}%`,
      status: source.dataQualityValue >= 85 ? "success" : source.dataQualityValue >= 60 ? "warning" : "risk",
      trend: source.dataQualityValue >= 85 ? "up" : source.dataQualityValue >= 60 ? "flat" : "down",
      description: source.dataQualityValue >= 85 ? "Healthy coverage" : "Gaps detected",
      origin: "fallback",
    });
  }

  const rowCount = coerceNumber(source.identityStats?.rows) ?? coerceNumber(source.metrics?.recordsProcessed);
  if (typeof rowCount === "number") {
    entries.push({
      id: "fallback-volume",
      label: "Records Analyzed",
      value: formatNumber(rowCount),
      status: "neutral",
      trend: "flat",
      description: "Total rows scanned during ingestion",
      origin: "fallback",
    });
  }

  const segments = source.clusterMetrics?.clusters?.length || source.personas?.length;
  if (segments) {
    entries.push({
      id: "fallback-segments",
      label: "Segments",
      value: `${segments}`,
      status: "neutral",
      trend: "flat",
      description: "Behavioral groupings detected",
      origin: "fallback",
    });
  }

  return entries.slice(0, 4);
}

function formatValue(value?: number, unit?: string, format?: string) {
  if (value === undefined || value === null) return undefined;
  const fmt = format || unit;
  if (fmt === "percent" || fmt === "%") {
    const pct = value > 1 ? value : value * 100;
    return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
  }
  if (fmt === "currency" || fmt === "$") {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (fmt === "integer") {
    return formatNumber(value, 0);
  }
  if (fmt === "decimal") {
    return value.toFixed(2);
  }
  return formatNumber(value);
}

function formatDelta(deltaPct?: number, deltaValue?: number, unit?: string) {
  if (typeof deltaPct === "number" && !Number.isNaN(deltaPct)) {
    const pct = deltaPct > 1 ? deltaPct : deltaPct * 100;
    return `${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}% vs. baseline`;
  }
  if (typeof deltaValue === "number" && !Number.isNaN(deltaValue)) {
    const formatted = formatValue(deltaValue, unit);
    return formatted ? `${formatted} change` : undefined;
  }
  return undefined;
}

function formatConfidence(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(0)}% confidence`;
}

function formatNumber(value: number, maxFraction = 1) {
  const abs = Math.abs(value);
  const notation = abs >= 1000 ? "compact" : "standard";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: maxFraction, notation }).format(value);
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim();
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function deriveTrend(delta?: number) {
  if (typeof delta !== "number" || Number.isNaN(delta) || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}
