interface ValidationIssue {
  type: "warning" | "error" | "info";
  message: string;
}

interface ValidationSummaryPanelProps {
  dataQualityScore: number;
  issues?: ValidationIssue[];
  suppressedCount?: number;
  className?: string;
  insightPolicy?: "endorsed" | "limited" | "blocked";
}

export function ValidationSummaryPanel({
  dataQualityScore,
  issues = [],
  suppressedCount = 0,
  className,
  insightPolicy = "endorsed",
}: ValidationSummaryPanelProps) {
  return null;
}
