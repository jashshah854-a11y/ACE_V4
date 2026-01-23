
import { Shield, HelpCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export type ConfidenceLevel = "high" | "medium" | "low";

interface ConfidenceBadgeProps {
    level: ConfidenceLevel;
    score?: number; // 0-1 (e.g., 0.85) or 0-100
    className?: string;
    showLabel?: boolean;
    details?: {
        dataCoverage?: string;
        validationStatus?: string;
        sampleSufficiency?: string;
        scopeNote?: string;
    };
}

export function ConfidenceBadge({ level, score, className, showLabel = true, details }: ConfidenceBadgeProps) {
    return null;
}

function buildDetails(level: ConfidenceLevel, displayScore: number | null) {
    const score = typeof displayScore === "number" ? displayScore : undefined;
    const dataCoverage = level === "high"
        ? "Broad coverage across key fields"
        : level === "medium"
            ? "Mixed coverage, some gaps"
            : "Sparse coverage, notable gaps";
    const validationStatus = score !== undefined && score >= 80
        ? "Passed core checks"
        : score !== undefined && score >= 60
            ? "Borderline checks"
            : "Requires validation";
    const sampleSufficiency = level === "high"
        ? "Sufficient sample size"
        : level === "medium"
            ? "Sample size needs review"
            : "Limited sample size";

    return {
        dataCoverage,
        validationStatus,
        sampleSufficiency,
    };
}
