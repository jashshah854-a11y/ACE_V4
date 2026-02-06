import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Circle,
  XCircle,
  Fingerprint,
  ScanSearch,
  Brain,
  ShieldCheck,
  ListChecks,
  TrendingUp,
  Clock,
  AlertTriangle,
  Users,
  Wrench,
  Database,
  Sparkles,
  Link2,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Mic,
  FileText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STEPS } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

const STEP_ICONS: Record<string, LucideIcon> = {
  ingestion: Database,
  type_identifier: Fingerprint,
  scanner: ScanSearch,
  interpreter: Brain,
  validator: ShieldCheck,
  overseer: ListChecks,
  regression: TrendingUp,
  time_series: Clock,
  sentry: AlertTriangle,
  personas: Users,
  fabricator: Wrench,
  raw_data_sampler: Database,
  deep_insight: Sparkles,
  dot_connector: Link2,
  hypothesis_engine: Lightbulb,
  so_what_deepener: HelpCircle,
  story_framer: BookOpen,
  executive_narrator: Mic,
  expositor: FileText,
  trust_evaluation: Shield,
};

interface StepListProps {
  currentStep: string;
  stepsCompleted: string[];
  status: string;
}

export function StepList({
  currentStep,
  stepsCompleted,
  status,
}: StepListProps) {
  const isFailed = status === "failed";
  const isDone = status === "completed" || status === "complete";

  return (
    <div className="space-y-1">
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = isDone || stepsCompleted.includes(step.key);
        const isActive = !isDone && step.key === currentStep;
        const isFailedStep = isFailed && step.key === currentStep;
        const isPending = !isCompleted && !isActive;
        const Icon = STEP_ICONS[step.key] || Circle;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive && "bg-blue-500/10 border border-blue-500/20",
              isFailedStep && "bg-red-500/10 border border-red-500/20",
              isCompleted && !isActive && "opacity-60",
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                isActive && "bg-blue-600 text-white",
                isFailedStep && "bg-red-600 text-white",
                isCompleted && !isActive && "bg-green-600/10 text-green-500",
                isPending && !isFailedStep && "bg-secondary text-muted-foreground",
              )}
            >
              {isActive && !isFailedStep ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFailedStep ? (
                <XCircle className="w-3.5 h-3.5" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isActive && "text-blue-400",
                    isFailedStep && "text-red-400",
                    isPending && !isFailedStep && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {step.key}
                </p>
              </div>

              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider shrink-0",
                  isActive && "text-blue-400",
                  isFailedStep && "text-red-400",
                  isCompleted && !isActive && "text-green-500",
                  isPending && !isFailedStep && "text-muted-foreground/50",
                )}
              >
                {isActive && !isFailedStep
                  ? "Running"
                  : isFailedStep
                    ? "Failed"
                    : isCompleted
                      ? "Done"
                      : `${index + 1}/${PIPELINE_STEPS.length}`}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
