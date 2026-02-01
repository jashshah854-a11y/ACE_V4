/**
 * Hook for managing evidence data and governed insights
 */
import { useMemo } from "react";
import type { GovernedReport } from "@/hooks/useGovernedReport";

export interface EvidenceSummary {
  id: string;
  title: string;
  method?: string;
  columns: string[];
  confidence?: number;
  scope?: string;
  sourceCode?: string;
  dataSource?: string;
  sourceNotes?: string;
  raw?: unknown;
}

export interface GovernedInsightSummary {
  id: string;
  claim?: string;
  agent?: string;
  severity?: string;
  metricName?: string;
  evidenceId?: string;
  columns?: string[];
  confidence?: number;
  impact?: string;
  evidence?: EvidenceSummary;
}

function normalizeEvidenceConfidence(value?: number): number | undefined {
  if (typeof value !== "number") return undefined;
  if (value > 1) return Number(value);
  return Number((value * 100).toFixed(1));
}

function normalizeEvidenceMap(
  raw?: Record<string, unknown> | null
): Record<string, EvidenceSummary> {
  if (!raw) return {};
  const entries = Object.entries(raw);
  if (!entries.length) return {};

  return entries.reduce<Record<string, EvidenceSummary>>((acc, [evidenceId, record]) => {
    const payload = (record || {}) as Record<string, unknown>;
    const evidence = ((payload.evidence as Record<string, unknown>) ?? payload) as Record<string, unknown>;
    const title = (payload.claim as string) || (evidence.metric as string) || `Evidence ${evidenceId}`;
    const columns = Array.isArray(evidence.source_columns)
      ? (evidence.source_columns as string[])
      : [];
    const method = (evidence.methodology as string) || (payload.method as string);
    const confidence = normalizeEvidenceConfidence(
      (payload.confidence as number) ?? (evidence.confidence as number)
    );

    acc[evidenceId] = {
      id: evidenceId,
      title,
      method,
      columns,
      confidence,
      scope: payload.scope as string | undefined,
      sourceCode: typeof evidence.source_code === "string" ? evidence.source_code : undefined,
      dataSource: typeof evidence.data_source === "string" ? evidence.data_source : undefined,
      sourceNotes: typeof evidence.source_notes === "string" ? evidence.source_notes : undefined,
      raw: payload,
    };
    return acc;
  }, {});
}

function normalizeGovernedInsights(
  raw?: unknown[] | null,
  evidenceMap: Record<string, EvidenceSummary> = {}
): GovernedInsightSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((insight: unknown, index) => {
    const item = insight as Record<string, unknown>;
    const evidenceId = (item?.evidence_ref || item?.evidence_id) as string | undefined;
    return {
      id: (item?.id as string) || evidenceId || `insight-${index}`,
      claim: item?.claim as string | undefined,
      agent: item?.agent as string | undefined,
      severity: item?.severity as string | undefined,
      metricName: (item?.metric_name || item?.metric) as string | undefined,
      columns: (item?.columns_used || item?.columns || []) as string[],
      confidence: normalizeEvidenceConfidence(item?.confidence as number),
      impact: item?.impact as string | undefined,
      evidenceId,
      evidence: evidenceId ? evidenceMap[evidenceId] : undefined,
    };
  });
}

export interface UseReportEvidenceResult {
  evidenceMap: Record<string, EvidenceSummary>;
  evidenceScopeMap: Record<string, EvidenceSummary>;
  governedInsights: GovernedInsightSummary[];
}

export function useReportEvidence(
  governedReport?: GovernedReport | null
): UseReportEvidenceResult {
  const evidenceMap = useMemo(
    () => normalizeEvidenceMap(governedReport?.evidence as Record<string, unknown> | null),
    [governedReport?.evidence]
  );

  const evidenceScopeMap = useMemo(() => {
    const scopeIndex: Record<string, EvidenceSummary> = {};
    Object.values(evidenceMap).forEach((entry) => {
      if (entry?.scope) {
        scopeIndex[entry.scope] = entry;
      }
    });
    return scopeIndex;
  }, [evidenceMap]);

  const governedInsights = useMemo(
    () => normalizeGovernedInsights(governedReport?.insights as unknown[], evidenceMap),
    [governedReport?.insights, evidenceMap]
  );

  return {
    evidenceMap,
    evidenceScopeMap,
    governedInsights,
  };
}
