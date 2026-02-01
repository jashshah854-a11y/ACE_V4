/**
 * Hook for extracting narrative components (brief, insights, actions)
 */
import { useMemo } from "react";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";
import { extractExecutiveBrief, extractConclusion } from "@/lib/narrativeExtractors";
import { assembleNarrative, type NarrativeModule } from "@/lib/meaningAssembler";
import type { ScoredSection, Anomalies } from "./useReportMetrics";

export interface ExecutiveBrief {
  purpose: string;
  keyFindings: string[];
  confidenceVerdict: string;
  recommendedAction: string;
}

export interface Conclusion {
  shouldUseFor: string[];
  shouldNotUseFor: string[];
  nextStep: string;
}

export interface HeroInsight {
  title?: string;
  keyInsight: string;
  impact: "high" | "medium" | "low";
  trend: "up" | "down" | "neutral";
  confidence: number;
  dataQuality: number;
  recommendation: string;
}

export interface MondayAction {
  title: string;
  description?: string;
  priority?: string;
  [key: string]: unknown;
}

export interface NarrativeAssembly {
  governingThought: string;
  primary: NarrativeModule[];
  appendix: NarrativeModule[];
}

export interface UseNarrativeDataResult {
  executiveBrief: ExecutiveBrief;
  conclusion: Conclusion;
  heroInsight: HeroInsight;
  mondayActions: MondayAction[];
  segmentComparisonData: unknown[];
  keyTakeaways: string[];
  narrativeAssembly: NarrativeAssembly;
}

export function useNarrativeData(
  reportContent: string,
  metrics: Record<string, unknown>,
  gatedAnomalies: Anomalies | null,
  scoredSections: ScoredSection[],
  isFallbackReport: boolean,
  primaryQuestion?: string,
  successCriteria?: string
): UseNarrativeDataResult {
  const executiveBrief = useMemo(() => {
    if (isFallbackReport) {
      const lines = reportContent.split("\n").filter((line) => line.trim().length > 0);
      const purpose =
        lines.find((line) => line.toLowerCase().includes("notice")) ||
        "The system encountered an error during analysis.";
      const status =
        lines.find((line) => line.toLowerCase().includes("status:")) ||
        "Status: Incomplete";
      return {
        purpose: purpose.replace(/^[>#\-\s*]+/, "").trim(),
        keyFindings: [status.replace(/^[>#\-\s*]+/, "").trim()],
        confidenceVerdict: "Low (Fallback)",
        recommendedAction: "Please review the diagnostics section or retry the analysis.",
      };
    }
    return extractExecutiveBrief(reportContent);
  }, [reportContent, isFallbackReport]);

  const conclusion = useMemo(() => extractConclusion(reportContent), [reportContent]);

  const heroInsight = useMemo(
    () => extractHeroInsight(reportContent, metrics),
    [reportContent, metrics]
  );

  const mondayActions = useMemo(
    () => generateMondayActions(reportContent, metrics, gatedAnomalies),
    [reportContent, metrics, gatedAnomalies]
  );

  const segmentComparisonData = useMemo(
    () => extractSegmentData(reportContent),
    [reportContent]
  );

  const keyTakeaways = useMemo(
    () =>
      reportContent
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("*"))
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 20 && line.length < 150)
        .slice(0, 5),
    [reportContent]
  );

  const narrativeAssembly = useMemo(
    () =>
      assembleNarrative(scoredSections, {
        heroInsight,
        primaryQuestion,
        successCriteria,
      }),
    [scoredSections, heroInsight, primaryQuestion, successCriteria]
  );

  return {
    executiveBrief: executiveBrief || {
      purpose: "",
      keyFindings: [],
      confidenceVerdict: "",
      recommendedAction: "",
    },
    conclusion: conclusion || {
      shouldUseFor: [],
      shouldNotUseFor: [],
      nextStep: "",
    },
    heroInsight: heroInsight || {
      keyInsight: "",
      impact: "medium" as const,
      trend: "neutral" as const,
      confidence: 0,
      dataQuality: 0,
      recommendation: "",
    },
    mondayActions: mondayActions || [],
    segmentComparisonData: segmentComparisonData || [],
    keyTakeaways: keyTakeaways || [],
    narrativeAssembly,
  };
}
