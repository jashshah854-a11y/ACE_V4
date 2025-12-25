import React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getRunState, RunState } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useMemo, useEffect, useRef, useState } from "react";
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
  ChevronRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineStatusProps {
  runId: string;
  onComplete?: () => void;
}

const PIPELINE_STEPS = [
  { 
    key: "ingestion", 
    label: "Data Ingestion", 
    description: "Loading and parsing your dataset",
    icon: Database, 
    backendSteps: ["ingestion", "type_identifier"] 
  },
  { 
    key: "scanner", 
    label: "Schema Analysis", 
    description: "Understanding column types and structure",
    icon: Scan, 
    backendSteps: ["scanner", "interpreter"] 
  },
  { 
    key: "validator", 
    label: "Data Validation", 
    description: "Checking data quality and integrity",
    icon: ShieldCheck, 
    backendSteps: ["validator"] 
  },
  { 
    key: "clustering", 
    label: "Behavioral Clustering", 
    description: "Grouping similar customers together",
    icon: Users, 
    backendSteps: ["overseer"] 
  },
  { 
    key: "regression", 
    label: "Predictive Modeling", 
    description: "Building forecasting models",
    icon: LineChart, 
    backendSteps: ["regression"] 
  },
  { 
    key: "anomaly", 
    label: "Anomaly Detection", 
    description: "Finding unusual patterns",
    icon: AlertTriangle, 
    backendSteps: ["sentry"] 
  },
  { 
    key: "personas", 
    label: "Persona Generation", 
    description: "Creating customer profiles",
    icon: Sparkles, 
    backendSteps: ["personas"] 
  },
  { 
    key: "report", 
    label: "Report Generation", 
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

  const baseProgress = (completed / total) * 100;
  const activeProgress = activeIndex >= 0 ? (0.5 / total) * 100 : 0;

  return Math.min(100, baseProgress + activeProgress);
}

export function PipelineStatus({ runId, onComplete }: PipelineStatusProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const prevProgressRef = useRef(0);
  const prevCompleteRef = useRef(false);

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
      return PIPELINE_STEPS.reduce((acc, step) => ({ ...acc, [step.key]: "completed" }), {});
    }
    return getStepStates(state);
  }, [state, isComplete]);

  const targetProgress = useMemo(() => {
    if (isComplete) return 100;
    if (isFailed) return calculateProgress(stepStates);
    return calculateProgress(stepStates);
  }, [stepStates, isComplete, isFailed]);

  // Smooth progress animation with easing
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
      
      // Ease out cubic
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

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <span className="text-sm">Connecting to analysis engine...</span>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const activeStepIndex = PIPELINE_STEPS.findIndex(step => stepStates[step.key] === "active");
  const activeStep = activeStepIndex >= 0 ? PIPELINE_STEPS[activeStepIndex] : null;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm relative overflow-hidden"
      >
        {/* Celebration Confetti Effect */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 1,
                    x: "50%",
                    y: "50%",
                    scale: 0,
                  }}
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
                    backgroundColor: ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899"][i % 4],
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <motion.div 
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500",
                isComplete && "bg-success/10",
                isFailed && "bg-destructive/10",
                !isComplete && !isFailed && "bg-primary/10"
              )}
              animate={!isComplete && !isFailed ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </motion.div>
              ) : isFailed ? (
                <AlertCircle className="w-6 h-6 text-destructive" />
              ) : (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              )}
            </motion.div>
            <div>
              <h3 className="font-semibold text-lg">
                {isComplete ? "Analysis Complete" : isFailed ? "Analysis Failed" : "Analyzing Your Data"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Run: <code className="font-mono text-xs bg-muted/60 px-1.5 py-0.5 rounded">{runId.slice(0, 8)}</code>
              </p>
            </div>
          </div>
          
          {/* Percentage Display */}
          <div className="text-right">
            <motion.span
              key={displayProgress}
              initial={{ opacity: 0.5, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "text-3xl font-bold tabular-nums",
                isComplete ? "text-success" : isFailed ? "text-destructive" : "text-primary"
              )}
            >
              {displayProgress}%
            </motion.span>
            <p className="text-xs text-muted-foreground">
              {isComplete ? "Complete" : isFailed ? "Failed" : "Processing"}
            </p>
          </div>
        </div>

        {/* Progress Bar with Enhanced Styling */}
        <div className="relative h-3 bg-muted/60 rounded-full overflow-hidden mb-2">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              isComplete ? "bg-gradient-to-r from-green-500 to-green-600" : 
              isFailed ? "bg-gradient-to-r from-red-500 to-red-600" : 
              "bg-gradient-to-r from-primary to-primary/80"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {/* Animated shimmer for active state */}
          {!isComplete && !isFailed && displayProgress > 0 && (
            <motion.div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: [-80, 400] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {/* Pulsing glow effect on active */}
          {!isComplete && !isFailed && displayProgress > 0 && (
            <motion.div
              className="absolute inset-0 bg-primary/20 blur-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: `${displayProgress}%` }}
            />
          )}
        </div>
        
        {/* Estimated Time Remaining */}
        {!isComplete && !isFailed && displayProgress > 0 && (
          <p className="text-xs text-muted-foreground text-right mb-6">
            Estimated time: ~{Math.ceil((100 - displayProgress) / 10)} min remaining
          </p>
        )}

        {/* Currently Processing Callout */}
        <AnimatePresence mode="wait">
          {activeStep && !isComplete && !isFailed && (
            <motion.div
              key={activeStep.key}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <activeStep.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-primary">{activeStep.label}</span>
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  </div>
                  <p className="text-xs text-muted-foreground">{activeStep.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Step {activeStepIndex + 1} of {PIPELINE_STEPS.length}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop: Horizontal Timeline */}
        <div className="hidden md:block mb-6">
          <div className="relative flex items-center justify-between">
            {PIPELINE_STEPS.map((step, index) => {
              const status = stepStates[step.key] || "pending";
              const isActive = status === "active" && !isComplete && !isFailed;
              const isCompleted = status === "completed" || isComplete;
              const isPending = status === "pending" && !isComplete && !isFailed;
              const Icon = step.icon;

              return (
                <React.Fragment key={step.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        className="flex flex-col items-center gap-2 flex-1"
                      >
                        {/* Icon Circle */}
                        <motion.div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 relative z-10",
                            isCompleted && "bg-green-500 border-green-500 text-white",
                            isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/50",
                            isPending && "bg-muted border-border text-muted-foreground"
                          )}
                          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {isCompleted ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                              <CheckCircle2 className="w-6 h-6" />
                            </motion.div>
                          ) : isActive ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </motion.div>

                        {/* Label */}
                        <p
                          className={cn(
                            "text-xs font-medium text-center transition-colors duration-300",
                            isActive && "text-primary font-semibold",
                            isCompleted && "text-foreground",
                            isPending && "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </p>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Connecting Line */}
                  {index < PIPELINE_STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border relative -mx-4 mt-[-38px] z-0">
                      <motion.div
                        className={cn(
                          "h-full transition-all duration-500",
                          (stepStates[step.key] === "completed" || isComplete) ? "bg-green-500" : "bg-border"
                        )}
                        initial={{ width: "0%" }}
                        animate={{
                          width: (stepStates[step.key] === "completed" || isComplete) ? "100%" : "0%"
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Mobile: Vertical Stack (IN ORDER) */}
        <div className="md:hidden space-y-3">
          {PIPELINE_STEPS.map((step, index) => {
            const status = stepStates[step.key] || "pending";
            const isActive = status === "active" && !isComplete && !isFailed;
            const isCompleted = status === "completed" || isComplete;
            const isPending = status === "pending" && !isComplete && !isFailed;
            const Icon = step.icon;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={cn(
                  "relative p-4 rounded-xl border transition-all duration-300",
                  isActive && "bg-primary/5 border-primary/30 shadow-sm",
                  isCompleted && "bg-green-500/5 border-green-500/20",
                  isPending && "bg-muted/30 border-border/40 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2",
                      isCompleted && "bg-green-500 border-green-500 text-white",
                      isActive && "bg-primary border-primary text-primary-foreground",
                      isPending && "bg-muted border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium mb-0.5",
                        isActive && "text-primary",
                        isCompleted && "text-foreground",
                        isPending && "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {/* Step Number */}
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-full",
                      isCompleted && "bg-green-500/10 text-green-700 dark:text-green-400",
                      isActive && "bg-primary/10 text-primary",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                </div>

                {/* Connecting Line for Mobile */}
                {index < PIPELINE_STEPS.length - 1 && (
                  <div className="absolute left-9 top-14 w-0.5 h-4 bg-border">
                    {(stepStates[step.key] === "completed" || isComplete) && (
                      <div className="w-full h-full bg-green-500" />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Error Message */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
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
