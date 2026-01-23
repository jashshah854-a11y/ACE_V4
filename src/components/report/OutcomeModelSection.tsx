import type { AnalysisIntent, ScopeConstraint, TargetCandidate } from "@/types/analysisIntent";
import type { OutcomeModelData } from "@/lib/reportParser";

interface OutcomeModelSectionProps {
  data: OutcomeModelData | null;
  scopeConstraints?: ScopeConstraint[];
  analysisIntent?: AnalysisIntent;
  targetCandidate?: TargetCandidate;
}

export function OutcomeModelSection({ data, scopeConstraints = [], analysisIntent, targetCandidate }: OutcomeModelSectionProps) {
  return null;
}
