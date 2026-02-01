/**
 * Pipeline header with status icon, progress percentage, and animated progress bar.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { PIPELINE_STEPS, type StepState } from "./types";

interface PipelineHeaderProps {
  runId: string;
  isComplete: boolean;
  isFailed: boolean;
  isFetching: boolean;
  displayProgress: number;
  stepStates: Record<string, StepState>;
  showCelebration: boolean;
}

export function PipelineHeader({
  runId,
  isComplete,
  isFailed,
  isFetching,
  displayProgress,
  stepStates,
  showCelebration,
}: PipelineHeaderProps) {
  const completedCount = PIPELINE_STEPS.filter(
    (step) => stepStates[step.key] === "completed"
  ).length;

  return (
    <>
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
                transition={{
                  duration: 1.5,
                  ease: "easeOut",
                  delay: i * 0.05,
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full pointer-events-none"
                style={{
                  backgroundColor: [
                    "hsl(168 70% 35%)",
                    "hsl(200 75% 50%)",
                    "hsl(260 70% 60%)",
                    "hsl(340 80% 60%)",
                  ][i % 4],
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
              animate={
                !isComplete && !isFailed ? { scale: [1, 1.03, 1] } : {}
              }
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              {isComplete ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <SafeIcon
                    icon={CheckCircle2}
                    className="w-7 h-7 text-success"
                  />
                </motion.div>
              ) : isFailed ? (
                <SafeIcon
                  icon={AlertCircle}
                  className="w-7 h-7 text-destructive"
                />
              ) : (
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              )}
            </motion.div>
            <div>
              <h3 className="font-semibold text-xl">
                {isComplete
                  ? "Analysis Complete"
                  : isFailed
                    ? "Analysis Failed"
                    : "Analyzing Your Data"}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
                  {runId.slice(0, 8)}
                </code>
                {!isComplete && !isFailed && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Est. ~
                      {Math.max(
                        1,
                        Math.ceil((100 - displayProgress) / 12)
                      )}{" "}
                      min
                    </span>
                    {isFetching && (
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
                isComplete
                  ? "text-success"
                  : isFailed
                    ? "text-destructive"
                    : "text-primary"
              )}
            >
              {displayProgress}%
            </motion.div>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? "Complete"
                : isFailed
                  ? "Failed"
                  : `${completedCount}/${PIPELINE_STEPS.length} steps`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden mt-6">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              isComplete
                ? "bg-success"
                : isFailed
                  ? "bg-destructive"
                  : "bg-primary"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {!isComplete && !isFailed && displayProgress > 0 && (
            <motion.div
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent"
              animate={{ x: [-96, 500] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
