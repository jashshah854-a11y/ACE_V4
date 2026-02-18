import type { EvidenceRef as EvidenceRefType } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface Props {
  evidence: EvidenceRefType;
  onNavigate: (section: string, key: string) => void;
}

export function EvidenceRefBadge({ evidence, onNavigate }: Props) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(evidence.section, evidence.key)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium
        bg-teal-500/10 text-teal-400 border border-teal-500/20
        hover:bg-teal-500/20 hover:border-teal-500/40
        transition-colors cursor-pointer"
      title={`${evidence.label}: ${evidence.value}`}
    >
      <ExternalLink className="w-3 h-3" />
      {evidence.label}
    </button>
  );
}
