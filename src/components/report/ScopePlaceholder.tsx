import type { AnalysisIntent, ScopeConstraintDisplay, TargetCandidate } from "@/types/analysisIntent";

interface ScopePlaceholderProps {
  sectionName: string;
  agentKey: string;
  scopeConstraints: ScopeConstraintDisplay[];
  analysisIntent?: AnalysisIntent;
  targetCandidate?: TargetCandidate;
  className?: string;
}

export function ScopePlaceholder({
  sectionName,
  agentKey,
  scopeConstraints,
  analysisIntent,
  targetCandidate,
  className,
}: ScopePlaceholderProps) {
  return null;
}
