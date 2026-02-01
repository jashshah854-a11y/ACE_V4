/**
 * Scope boundary constraints section of the Overseer Interview.
 */
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock } from "lucide-react";

export interface ConstraintOption {
  id: string;
  label: string;
  description: string;
  locked?: boolean;
  lockedReason?: string;
}

interface InterviewConstraintsProps {
  options: ConstraintOption[];
  forbiddenClaims: string[];
  onToggle: (claimId: string, isLocked: boolean) => void;
}

export function InterviewConstraints({
  options,
  forbiddenClaims,
  onToggle,
}: InterviewConstraintsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl text-slate-900 dark:text-slate-100 font-medium">
        Are there strict boundaries we must respect?
      </h3>

      <p className="font-sans text-sm text-slate-500">
        Toggle any constraints that should limit our analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
        {options.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-lg border transition-all duration-200",
              option.locked
                ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80 cursor-not-allowed"
                : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-teal-500/50 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 cursor-pointer"
            )}
          >
            <Checkbox
              checked={forbiddenClaims.includes(option.id)}
              onCheckedChange={() => onToggle(option.id, !!option.locked)}
              disabled={option.locked}
              className="mt-1"
            />

            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between">
                {option.label}
                {option.locked && (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </div>

              <div className="text-xs text-slate-500 mt-1">
                {option.description}
              </div>

              {option.locked && option.lockedReason && (
                <div className="text-[10px] text-amber-600 dark:text-amber-500 mt-1.5 font-medium flex items-center gap-1">
                  <span>Locked: {option.lockedReason}</span>
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
