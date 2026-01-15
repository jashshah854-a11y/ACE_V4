import type { ReportDataResult } from "@/types/reportTypes";

type ReasoningCallback = (payload: { step: string; index: number; total: number; status: "progress" | "complete" }) => void;

export interface GroundingAudit {
  question: string;
  answer: string;
  grounded: boolean;
  metric?: string;
}

export interface RefusalCheck {
  refuse: boolean;
  reason?: string;
}

export function runGroundingAudit(report: ReportDataResult): GroundingAudit {
  const churn = report.enhancedAnalytics?.business_intelligence?.churn_risk;
  if (!churn) {
    return {
      question: "What is the exact count of at-risk users?",
      answer: "Unsupported",
      grounded: false,
    };
  }

  const metricPath = "business_intelligence.churn_risk";
  const percentage = typeof churn.at_risk_percentage === "number" ? churn.at_risk_percentage.toFixed(1) : "unknown";
  return {
    question: "What is the exact count of at-risk users?",
    answer: `${churn.at_risk_count} records (${percentage}%) flagged on ${churn.activity_column}`,
    grounded: true,
    metric: metricPath,
  };
}

export function shouldRefuseQuestion(question: string, report: ReportDataResult): RefusalCheck {
  const lower = question.toLowerCase();
  const wantsFutureFinancials = lower.includes("projected") || lower.includes("forecast") || lower.includes("2026");
  const referencesRevenue = lower.includes("revenue") || lower.includes("profit") || lower.includes("sales");
  const lockedDimension = report.scopeLocks?.find((lock) =>
    lock?.dimension?.toLowerCase().includes("revenue") || lock?.dimension?.toLowerCase().includes("financial"),
  );

  if ((wantsFutureFinancials || referencesRevenue) && lockedDimension) {
    return {
      refuse: true,
      reason: `Forbidden dimension: ${lockedDimension.dimension}`,
    };
  }

  if (referencesRevenue && !report.enhancedAnalytics?.business_intelligence?.value_metrics) {
    return {
      refuse: true,
      reason: "No financial metrics available for this dataset",
    };
  }

  return { refuse: false };
}

export function simulateReasoningStream(steps: string[], emit: ReasoningCallback) {
  const total = steps.length;
  steps.forEach((step, index) => {
    emit({ step, index, total, status: "progress" });
  });
  emit({ step: "complete", index: total, total, status: "complete" });
}
