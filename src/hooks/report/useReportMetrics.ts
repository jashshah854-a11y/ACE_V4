/**
 * Hook for extracting and processing report metrics
 */
import { useMemo } from "react";
import {
  extractMetrics,
  extractSections,
  extractProgressMetrics,
  extractChartData,
  parseClusterMetrics,
  extractPersonas,
  extractOutcomeModel,
  extractAnomalies,
} from "@/lib/reportParser";
import type { EvidenceSummary } from "./useReportEvidence";

const MIN_IMPORTANCE = 0.05;

function parseImportanceFromContent(content: string, index: number): number {
  const importanceMatch = content.match(/importance(?:\s*score)?[:\s]+(\d+(?:\.\d+)?)/i);
  if (importanceMatch) {
    const raw = parseFloat(importanceMatch[1]);
    if (!Number.isNaN(raw)) {
      const normalized = raw > 1 ? raw / 100 : raw;
      return Math.max(MIN_IMPORTANCE, Math.min(1, normalized));
    }
  }
  if (/executive|summary/.test(content.toLowerCase())) {
    return 0.9;
  }
  return Math.max(MIN_IMPORTANCE, 0.75 - index * 0.05);
}

export interface ScoredSection {
  title: string;
  content: string;
  importance: number;
}

export interface ClusterMetrics {
  k?: number;
  silhouette?: number;
  evidenceId?: string;
  [key: string]: unknown;
}

export interface Persona {
  label?: string;
  description?: string;
  evidenceId?: string;
  [key: string]: unknown;
}

export interface OutcomeModel {
  target?: string;
  features?: Array<{ name: string; importance: number }>;
  [key: string]: unknown;
}

export interface Anomalies {
  count: number;
  drivers: string[];
  [key: string]: unknown;
}

export interface UseReportMetricsResult {
  metrics: Record<string, unknown>;
  progressMetrics: Record<string, unknown>;
  sections: Array<{ title: string; content: string }>;
  scoredSections: ScoredSection[];
  segmentData: unknown[];
  compositionData: unknown[];
  measurableSegments: Array<{ label: string; subtitle?: string; [key: string]: unknown }>;
  rawClusterMetrics: ClusterMetrics | null;
  clusterMetrics: ClusterMetrics | null;
  rawPersonas: Persona[];
  personas: Persona[];
  outcomeModel: OutcomeModel | null;
  gatedOutcomeModel: OutcomeModel | null;
  anomalies: Anomalies | null;
  gatedAnomalies: Anomalies | null;
  isFallbackReport: boolean;
}

export function useReportMetrics(
  reportContent: string,
  evidenceScopeMap: Record<string, EvidenceSummary>,
  allowPersonas: boolean,
  allowAnomalies: boolean,
  allowRegression: boolean
): UseReportMetricsResult {
  // Detect fallback/error report
  const isFallbackReport = useMemo(() => {
    const lower = reportContent.toLowerCase();
    return (
      lower.includes("system notice") ||
      lower.includes("analysis failed") ||
      lower.includes("analysis report (partially_complete)") ||
      (lower.includes("# analysis report") && lower.includes("diagnostics"))
    );
  }, [reportContent]);

  // Core extraction
  const metrics = useMemo(() => extractMetrics(reportContent), [reportContent]);
  const progressMetrics = useMemo(() => extractProgressMetrics(reportContent), [reportContent]);
  const sections = useMemo(() => extractSections(reportContent), [reportContent]);

  const scoredSections = useMemo(
    () =>
      sections.map((section, index) => ({
        ...section,
        importance: parseImportanceFromContent(section.content, index),
      })),
    [sections]
  );

  const { segmentData, compositionData } = useMemo(
    () => extractChartData(reportContent),
    [reportContent]
  );

  const measurableSegments = useMemo(
    () =>
      (segmentData || []).map((seg: Record<string, unknown>) => ({
        ...seg,
        label: seg?.label ? `${seg.label}` : "Segment",
        subtitle: seg?.avgValue ? `avg=${Math.round(seg.avgValue as number)}` : undefined,
      })),
    [segmentData]
  );

  const rawClusterMetrics = useMemo(
    () => parseClusterMetrics(reportContent),
    [reportContent]
  );
  const rawPersonas = useMemo(() => extractPersonas(reportContent), [reportContent]);
  const outcomeModel = useMemo(() => extractOutcomeModel(reportContent), [reportContent]);
  const anomalies = useMemo(() => extractAnomalies(reportContent), [reportContent]);

  const gatedOutcomeModel = useMemo(
    () => (allowRegression ? outcomeModel : null),
    [outcomeModel, allowRegression]
  );
  const gatedAnomalies = useMemo(
    () => (allowAnomalies ? anomalies : null),
    [anomalies, allowAnomalies]
  );

  const clusteringEvidenceId = evidenceScopeMap.clustering?.id;

  const clusterMetrics = useMemo(() => {
    if (!rawClusterMetrics || !clusteringEvidenceId) return rawClusterMetrics;
    return { ...rawClusterMetrics, evidenceId: clusteringEvidenceId };
  }, [rawClusterMetrics, clusteringEvidenceId]);

  const personas = useMemo(() => {
    if (!allowPersonas) return [];
    if (!rawPersonas?.length || !clusteringEvidenceId) return rawPersonas;
    return rawPersonas.map((persona) => ({ ...persona, evidenceId: clusteringEvidenceId }));
  }, [rawPersonas, clusteringEvidenceId, allowPersonas]);

  return {
    metrics,
    progressMetrics,
    sections,
    scoredSections,
    segmentData: segmentData || [],
    compositionData: compositionData || [],
    measurableSegments,
    rawClusterMetrics,
    clusterMetrics,
    rawPersonas,
    personas,
    outcomeModel,
    gatedOutcomeModel,
    anomalies,
    gatedAnomalies,
    isFallbackReport,
  };
}
