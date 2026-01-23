import type { TrustModel } from "@/types/trust";

interface TrustBadgeProps {
  trust: TrustModel;
  className?: string;
  showScore?: boolean;
}

export function TrustBadge({ trust, className, showScore = false }: TrustBadgeProps) {
  return null;
}
