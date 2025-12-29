import React, { useMemo, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getRunState, RunState } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Database,
  Scan,
  ShieldCheck,
  Users,
  LineChart,
  AlertTriangle,
  Sparkles,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SafeIcon } from "@/components/ui/SafeIcon";

interface PipelineStatusProps {
  runId: string;
  onComplete?: () => void;
}

const PIPELINE_STEPS = [
  {
    key: "ingestion",
    label: "Data Ingestion",
    shortLabel: "Ingestion",
    description: "Loading and parsing your dataset",
    icon: Database,
    backendSteps: ["ingestion", "type_identifier"]
  },
  {
    key: "scanner",
    label: "Schema Analysis",
    shortLabel: "Schema",
    description: "Understanding column types and structure",
    icon: Scan,
    backendSteps: ["scanner", "interpreter"]
  },
  {
    key: "validator",
    label: "Data Validation",
    shortLabel: "Validation",
    description: "Checking data quality and integrity",
    icon: ShieldCheck,
    backendSteps: ["validator"]
  },
  {
    key: "clustering",
    label: "Behavioral Clustering",
    shortLabel: "Clustering",
    description: "Grouping similar customers together",
    icon: Users,
    backendSteps: ["overseer"]
  },
  {
    key: "regression",
    label: "Predictive Modeling",
    shortLabel: "Modeling",
    description: "Building forecasting models",
    icon: LineChart,
    backendSteps: ["regression"]
  },
  {
    key: "anomaly",
    label: "Anomaly Detection",
    shortLabel: "Anomaly",
    description: "Finding unusual patterns",
    icon: AlertTriangle,
    backendSteps: ["sentry"]
  },
  {
    key: "personas",
    label: "Persona Generation",
    shortLabel: "Personas",
    description: "Creating customer profiles",
    icon: Sparkles,
    backendSteps: ["personas"]
  },
  {
    key: "report",
    label: "Report Generation",
    shortLabel: "Report",
    description: "Compiling insights into your report",
    icon: FileText,
    backendSteps: ["fabricator", "expositor"]
  },
];

type StepState = "completed" | "active" | "pending";

function getStepStates(state: RunState): Record<string, StepState> {
  const currentStage = state.current_step?.toLowerCase() || "";
  const completedSteps = state.steps_completed || [];
  const result: Record<string, StepState> = {};

  // First pass: Mark all steps based on completion and backend state
  let foundActiveFromBackend = false;

  for (const step of PIPELINE_STEPS) {
    const allCompleted = step.backendSteps.every((s) => completedSteps.includes(s));
    const isActive = step.backendSteps.some((s) => currentStage.includes(s.toLowerCase()));

    if (allCompleted) {
      result[step.key] = "completed";
    } else if (isActive && !foundActiveFromBackend) {
      // Prioritize backend state: if backend says this step is active, mark it
      result[step.key] = "active";
      foundActiveFromBackend = true;
    } else {
      result[step.key] = "pending";
    }
  }

  // Second pass: Fallback - if no step was marked active from backend, mark first incomplete step
  if (!foundActiveFromBackend) {
    for (const step of PIPELINE_STEPS) {
      if (result[step.key] === "pending") {
        result[step.key] = "active";
        break;
      }
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

  const baseProgress = (completed / total) * 100;
  const activeProgress = activeIndex >= 0 ? (0.5 / total) * 100 : 0;

  return Math.min(100, baseProgress + activeProgress);
}

export function PipelineStatus({ runId, onComplete }: PipelineStatusProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevProgressRef = useRef(0);
  const prevCompleteRef = useRef(false);

  const {
    data: state,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery<RunState>({
    queryKey: ["run-state", runId],
    queryFn: () => getRunState(runId),
    enabled: Boolean(runId),
    retry: (failureCount, error) => {
      // Retry 404 errors (state not created yet) up to 3 times
      if (error instanceof Error && error.message.includes('404') && failureCount < 3) {
        return true;
      }
      // Don't retry other errors
      return false;
    },
    retryDelay: 2000,
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

    const startValue = displayProgress;
    const endValue = targetProgress;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * eased;

      setDisplayProgress(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevProgressRef.current = targetProgress;
  }, [targetProgress]);

  useEffect(() => {
    if (isComplete && onComplete) {
      if (!prevCompleteRef.current) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
      onComplete();
    }
    prevCompleteRef.current = isComplete;
  }, [isComplete, onComplete]);

  // Only show "Connecting..." on initial load (no data yet) or if we have a 404 error (state not created yet)
  const isInitialLoading = isLoading && !state;
  const is404Error = isError && error instanceof Error && error.message.includes('404');
  const shouldShowConnecting = isInitialLoading || is404Error;

  if (shouldShowConnecting) {
    return (
      <div className="p-8 rounded-2xl border border-border/40 bg-card shadow-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <p className="font-medium text-foreground">Connecting to analysis engine...</p>
            <p className="text-sm">Please wait while we establish connection</p>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const activeStepIndex = PIPELINE_STEPS.findIndex(step => stepStates[step.key] === "active");
  const activeStep = activeStepIndex >= 0 ? PIPELINE_STEPS[activeStepIndex] : null;
  const completedCount = PIPELINE_STEPS.filter(step => stepStates[step.key] === "completed").length;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden"
      >
        {/* Celebration Effect */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, x: "50%", y: "50%", scale: 0 }}
                  animate={{
                    opacity: 0,
                    x: `${Math.random() * 200 - 100}%`,
                    y: `${Math.random() * 200 - 100}%`,
                    scale: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.05 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{
                    backgroundColor: ["hsl(168 70% 35%)", "hsl(200 75% 50%)", "hsl(260 70% 60%)", "hsl(340 80% 60%)"][i % 4],
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500",
                  isComplete && "bg-success/10",
                  isFailed && "bg-destructive/10",
                  !isComplete && !isFailed && "bg-primary/10"
                )}
                animate={!isComplete && !isFailed ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <SafeIcon icon={CheckCircle2} className="w-7 h-7 text-success" />
                  </motion.div>
                ) : isFailed ? (
                  <SafeIcon icon={AlertCircle} className="w-7 h-7 text-destructive" />
                ) : (
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                )}
              </motion.div>
              <div>
                <h3 className="font-semibold text-xl">
                  {isComplete ? "Analysis Complete" : isFailed ? "Analysis Failed" : "Analyzing Your Data"}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                    {runId.slice(0, 8)}
                  </code>
                  {!isComplete && !isFailed && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        Est. ~{Math.max(1, Math.ceil((100 - displayProgress) / 12))} min
                      </span>
                      {isFetching && !isInitialLoading && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Updating...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Circle */}
            <div className="text-right">
              <motion.div
                className={cn(
                  "text-4xl font-bold tabular-nums",
                  isComplete ? "text-success" : isFailed ? "text-destructive" : "text-primary"
                )}
              >
                {displayProgress}%
              </motion.div>
              <p className="text-sm text-muted-foreground">
                {isComplete ? "Complete" : isFailed ? "Failed" : `${completedCount}/${PIPELINE_STEPS.length} steps`}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden mt-6">
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                isComplete ? "bg-success" : isFailed ? "bg-destructive" : "bg-primary"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${displayProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {!isComplete && !isFailed && displayProgress > 0 && (
              <motion.div
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
                animate={{ x: [-96, 500] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>

        {/* Active Step Callout */}
        <AnimatePresence mode="wait">
          {activeStep && !isComplete && !isFailed && (
            <motion.div
              key={activeStep.key}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3 }}
              className="px-6 py-4 bg-primary/5 border-b border-primary/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <SafeIcon icon={activeStep.icon} className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{activeStep.label}</span>
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{activeStep.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-primary">
                    Step {activeStepIndex + 1}
                  </span>
                  <span className="text-sm text-muted-foreground"> of {PIPELINE_STEPS.length}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden lg:block p-6">
          <div className="flex items-center">
            {PIPELINE_STEPS.map((step, index) => {
              const status = stepStates[step.key] || "pending";
              const isActive = status === "active" && !isComplete && !isFailed;
              const isCompleted = status === "completed" || isComplete;
              const isPending = status === "pending" && !isComplete && !isFailed;

              return (
                <React.Fragment key={step.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04, duration: 0.3 }}
                        className="flex flex-col items-center gap-2 flex-1"
                      >
                        {/* Step Circle */}
                        <motion.div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative",
                            isCompleted && "bg-success border-success text-success-foreground",
                            isActive && "bg-primary border-primary text-primary-foreground shadow-md",
                            isPending && "bg-muted/50 border-border text-muted-foreground"
                          )}
                          animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {isCompleted ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <SafeIcon icon={CheckCircle2} className="w-5 h-5" />
                            </motion.div>
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <SafeIcon icon={step.icon} className="w-4 h-4" />
                          )}

                          {/* Active glow ring */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-primary"
                              animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                            />
                          )}
                        </motion.div>

                        {/* Label */}
                        <span
                          className={cn(
                            "text-xs font-medium text-center transition-colors duration-300",
                            isActive && "text-primary font-semibold",
                            isCompleted && "text-foreground",
                            isPending && "text-muted-foreground"
                          )}
                        >
                          {step.shortLabel}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Connector Line */}
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border mx-1 relative">
                      <motion.div
                        className={cn(
                          "absolute inset-y-0 left-0 h-full",
                          isCompleted ? "bg-success" : "bg-border"
                        )}
                        initial={{ width: "0%" }}
                        animate={{ width: isCompleted ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Tablet: Compact Grid */}
        <div className="hidden md:block lg:hidden p-6">
          <div className="grid grid-cols-4 gap-3">
            {PIPELINE_STEPS.map((step, index) => {
              const status = stepStates[step.key] || "pending";
              const isActive = status === "active" && !isComplete && !isFailed;
              const isCompleted = status === "completed" || isComplete;
              const isPending = status === "pending" && !isComplete && !isFailed;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border transition-all duration-300",
                    isCompleted && "bg-success/5 border-success/20",
                    isActive && "bg-primary/5 border-primary/30 shadow-sm",
                    isPending && "bg-muted/30 border-border/40 opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isCompleted && "bg-success text-success-foreground",
                      isActive && "bg-primary text-primary-foreground",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <SafeIcon icon={CheckCircle2} className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <SafeIcon icon={step.icon} className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}>
                    {step.shortLabel}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="md:hidden p-4 space-y-0">
          {PIPELINE_STEPS.map((step, index) => {
            const status = stepStates[step.key] || "pending";
            const isActive = status === "active" && !isComplete && !isFailed;
            const isCompleted = status === "completed" || isComplete;
            const isPending = status === "pending" && !isComplete && !isFailed;
            const isLast = index === PIPELINE_STEPS.length - 1;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="flex gap-3"
              >
                {/* Timeline Line + Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300",
                      isCompleted && "bg-success border-success text-success-foreground",
                      isActive && "bg-primary border-primary text-primary-foreground shadow-md",
                      isPending && "bg-muted/50 border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <SafeIcon icon={CheckCircle2} className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <SafeIcon icon={step.icon} className="w-4 h-4" />
                    )}
                  </div>

                  {/* Vertical connector */}
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 flex-1 min-h-[24px] transition-colors duration-300",
                      isCompleted ? "bg-success" : "bg-border"
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 pb-4",
                  isLast && "pb-0"
                )}>
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-medium text-sm",
                      isActive && "text-primary",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {isActive && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Processing
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
                        Done
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5",
                    isPending ? "text-muted-foreground/60" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Error Message */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-6 p-4 rounded-xl bg-destructive/5 border border-destructive/20"
          >
            <div className="flex items-start gap-3">
              <SafeIcon icon={AlertCircle} className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">{state.error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
