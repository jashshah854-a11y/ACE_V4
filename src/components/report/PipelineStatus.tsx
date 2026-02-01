/**
 * PipelineStatus - Orchestrator component for pipeline visualization.
 *
 * Composed from:
 * - PipelineHeader: Status icon, progress %, animated bar
 * - PipelineActiveCallout: Currently active step banner
 * - PipelineTimeline: Responsive desktop/tablet/mobile views
 * - pipeline/types: Step definitions, state calculation, progress math
 */
import React, { useMemo, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getRunStatus, type RunState } from "@/lib/api-client";
import { Loader2, AlertCircle } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SafeIcon } from "@/components/ui/SafeIcon";
import {
  PIPELINE_STEPS,
  getStepStates,
  calculateProgress,
} from "./pipeline/types";
import { PipelineHeader } from "./pipeline/PipelineHeader";
import { PipelineActiveCallout } from "./pipeline/PipelineActiveCallout";
import { PipelineTimeline } from "./pipeline/PipelineTimeline";

interface PipelineStatusProps {
  runId: string;
  onComplete?: () => void;
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
    error,
  } = useQuery<RunState>({
    queryKey: ["run-state", runId],
    queryFn: () => getRunStatus(runId),
    enabled: Boolean(runId),
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        error.message.includes("404") &&
        failureCount < 3
      ) {
        return true;
      }
      return false;
    },
    retryDelay: 2000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (
        status === "completed" ||
        status === "complete" ||
        status === "failed"
      ) {
        return false;
      }
      return 2000;
    },
  });

  const isComplete =
    state?.status === "completed" ||
    state?.status === "complete" ||
    state?.status === "complete_with_errors";
  const isFailed = state?.status === "failed";

  const stepStates = useMemo(() => {
    if (!state) return {};
    if (isComplete) {
      return PIPELINE_STEPS.reduce(
        (acc, step) => ({ ...acc, [step.key]: "completed" as const }),
        {}
      );
    }
    return getStepStates(state);
  }, [state, isComplete]);

  const targetProgress = useMemo(() => {
    if (isComplete) return 100;
    return calculateProgress(stepStates);
  }, [stepStates, isComplete]);

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

  // Completion callback
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

  // Loading state
  const isInitialLoading = isLoading && !state;
  const is404Error =
    isError && error instanceof Error && error.message.includes("404");
  const shouldShowConnecting = isInitialLoading || is404Error;

  if (shouldShowConnecting) {
    return (
      <div className="p-8 rounded-2xl border border-border/40 bg-card shadow-sm">
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Connecting to analysis engine...
            </p>
            <p className="text-sm">
              Please wait while we establish connection
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden"
      >
        <PipelineHeader
          runId={runId}
          isComplete={isComplete}
          isFailed={isFailed}
          isFetching={isFetching && !isInitialLoading}
          displayProgress={displayProgress}
          stepStates={stepStates}
          showCelebration={showCelebration}
        />

        <PipelineActiveCallout
          stepStates={stepStates}
          isComplete={isComplete}
          isFailed={isFailed}
        />

        <PipelineTimeline
          stepStates={stepStates}
          isComplete={isComplete}
          isFailed={isFailed}
        />

        {/* Error Message */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-6 p-4 rounded-xl bg-destructive/5 border border-destructive/20"
          >
            <div className="flex items-start gap-3">
              <SafeIcon
                icon={AlertCircle}
                className="w-5 h-5 text-destructive shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Something went wrong
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {state.error}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </TooltipProvider>
  );
}
