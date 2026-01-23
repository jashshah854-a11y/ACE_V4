import type { TrustModel } from "@/types/trust";
import type { NarrativeMode } from "@/types/StoryTypes";

interface TrustBreakdownProps {
  trust: TrustModel;
  mode: NarrativeMode;
  insightId?: string;
  className?: string;
}

export function TrustBreakdown({ trust, mode, insightId, className }: TrustBreakdownProps) {
  return null;
}
