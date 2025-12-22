import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getRunState, RunState } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Cpu,
  Users,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";

interface PipelineStatusProps {
  runId: string;
  onComplete?: () => void;
}

const PIPELINE_STEPS = [
  { key: "ingestion", label: "Data Ingestion", icon: Database, backendSteps: ["ingestion", "type_identifier"] },
  { key: "scanner", label: "Schema Analysis", icon: Cpu, backendSteps: ["scanner", "interpreter"] },
  { key: "validator", label: "Data Validation", icon: CheckCircle2, backendSteps: ["validator"] },
  { key: "clustering", label: "Behavioral Clustering", icon: Users, backendSteps: ["overseer"] },
  { key: "regression", label: "Predictive Modeling", icon: Cpu, backendSteps: ["regression"] },
  { key: "anomaly", label: "Anomaly Detection", icon: AlertTriangle, backendSteps: ["sentry"] },
  { key: "personas", label: "Persona Generation", icon: Sparkles, backendSteps: ["personas"] },
  { key: "report", label: "Report Generation", icon: FileText, backendSteps: ["fabricator", "expositor"] },
];

type StepState = "completed" | "active" | "pending";

function getStepStates(state: RunState): Record<string, StepState> {
  const currentStage = state.current_step?.toLowerCase() || "";
  const completedSteps = state.steps_completed || [];
  const result: Record<string, StepState> = {};

  let foundActive = false;

  for (const step of PIPELINE_STEPS) {
    const allCompleted = step.backendSteps.every((s) => completedSteps.includes(s));
    const isActive = step.backendSteps.some((s) => currentStage.includes(s.toLowerCase()));

    if (allCompleted) {
      result[step.key] = "completed";
    } else if (isActive || (!foundActive && !allCompleted)) {
      result[step.key] = "active";
      foundActive = true;
    } else {
      result[step.key] = "pending";
    }
  }

  return result;
}

function calculateProgress(stepStates: Record<string, StepState>): number {
  const total = PIPELINE_STEPS.length;
  let completed = 0;
  let activeIndex = -1;

  PIPELINE_STEPS.forEach((step, index) => {
    if (stepStates[step.key] === "completed") {
      completed++;
    } else if (stepStates[step.key] === "active" && activeIndex === -1) {
      activeIndex = index;
    }
  });

  // Base progress from completed steps
  const baseProgress = (completed / total) * 100;
  
  // Add partial progress for active step (estimate 50% through active step)
  const activeProgress = activeIndex >= 0 ? (0.5 / total) * 100 : 0;

  return Math.min(100, baseProgress + activeProgress);
}

export function PipelineStatus({ runId, onComplete }: PipelineStatusProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const prevProgressRef = useRef(0);

  const { data: state, isLoading } = useQuery<RunState>({
    queryKey: ["run-state", runId],
    queryFn: () => getRunState(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "complete" || status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  const isComplete = state?.status === "completed" || state?.status === "complete";
  const isFailed = state?.status === "failed" || state?.status === "complete_with_errors";

  const stepStates = useMemo(() => {
    if (!state) return {};
    if (isComplete) {
      // All steps completed
      return PIPELINE_STEPS.reduce((acc, step) => ({ ...acc, [step.key]: "completed" }), {});
    }
    return getStepStates(state);
  }, [state, isComplete]);

  const targetProgress = useMemo(() => {
    if (isComplete) return 100;
    if (isFailed) return calculateProgress(stepStates);
    return calculateProgress(stepStates);
  }, [stepStates, isComplete, isFailed]);

  // Smooth progress animation
  useEffect(() => {
    if (targetProgress <= prevProgressRef.current) {
      prevProgressRef.current = targetProgress;
      setDisplayProgress(targetProgress);
      return;
    }

    const diff = targetProgress - prevProgressRef.current;
    const duration = 600; // ms
    const steps = 20;
    const increment = diff / steps;
    let current = prevProgressRef.current;

    const interval = setInterval(() => {
      current += increment;
      if (current >= targetProgress) {
        current = targetProgress;
        clearInterval(interval);
      }
      setDisplayProgress(Math.round(current));
    }, duration / steps);

    prevProgressRef.current = targetProgress;
    return () => clearInterval(interval);
  }, [targetProgress]);

  // Call onComplete when done
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Connecting to pipeline...</span>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"
            >
              <CheckCircle2 className="w-5 h-5 text-success" />
            </motion.div>
          ) : isFailed ? (
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg gradient-meridian flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
          <div>
            <h3 className="font-semibold">
              {isComplete ? "Analysis Complete" : isFailed ? "Analysis Failed" : "Analyzing Data"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Run ID: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{runId.slice(0, 8)}</code>
            </p>
          </div>
        </div>
        <div
          className={cn(
            "text-2xl font-bold tabular-nums transition-colors duration-300",
            isComplete ? "text-success" : isFailed ? "text-destructive" : "text-primary"
          )}
        >
          {displayProgress}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
        <motion.div
          className={cn(
            "h-full rounded-full transition-colors duration-300",
            isComplete ? "bg-success" : isFailed ? "bg-destructive" : "gradient-meridian"
          )}
          style={{ width: `${displayProgress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((step, index) => {
          const status = stepStates[step.key] || "pending";
          const isActive = status === "active" && !isComplete && !isFailed;
          const isCompleted = status === "completed" || isComplete;
          const isPending = status === "pending" && !isComplete && !isFailed;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                isActive && "bg-primary/10 border border-primary/20",
                isCompleted && !isActive && "opacity-70",
                isPending && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                  isActive && "gradient-meridian text-white",
                  isCompleted && !isActive && "bg-success/10 text-success",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate transition-colors duration-300",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-xs text-primary"
                >
                  <Clock className="w-3 h-3" />
                  <span>Processing</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current Step Detail */}
      {state.current_step && !isComplete && !isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-4 border-t border-border/50"
        >
          <p className="text-xs text-muted-foreground">
            Current: <span className="text-foreground font-medium">{state.current_step}</span>
            {state.next_step && (
              <>
                {" → Next: "}
                <span className="text-muted-foreground">{state.next_step}</span>
              </>
            )}
          </p>
        </motion.div>
      )}

      {/* Error Message */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <p className="text-sm text-destructive">{state.error}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
