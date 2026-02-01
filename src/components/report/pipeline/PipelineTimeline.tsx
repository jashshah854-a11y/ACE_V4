/**
 * Responsive pipeline timeline views: desktop horizontal, tablet grid, mobile vertical.
 */
import React from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { PIPELINE_STEPS, type StepState } from "./types";

interface PipelineTimelineProps {
  stepStates: Record<string, StepState>;
  isComplete: boolean;
  isFailed: boolean;
}

function DesktopTimeline({
  stepStates,
  isComplete,
  isFailed,
}: PipelineTimelineProps) {
  return (
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
                    <motion.div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative",
                        isCompleted &&
                          "bg-success border-success text-success-foreground",
                        isActive &&
                          "bg-primary border-primary text-primary-foreground shadow-md",
                        isPending &&
                          "bg-muted/50 border-border text-muted-foreground"
                      )}
                      animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      {isCompleted ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                        >
                          <SafeIcon icon={CheckCircle2} className="w-5 h-5" />
                        </motion.div>
                      ) : isActive ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <SafeIcon icon={step.icon} className="w-4 h-4" />
                      )}

                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-primary"
                          animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                      )}
                    </motion.div>

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
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                </TooltipContent>
              </Tooltip>

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
  );
}

function TabletTimeline({
  stepStates,
  isComplete,
  isFailed,
}: PipelineTimelineProps) {
  return (
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
              <span
                className={cn(
                  "text-xs font-medium truncate",
                  isActive && "text-primary",
                  isCompleted && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.shortLabel}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MobileTimeline({
  stepStates,
  isComplete,
  isFailed,
}: PipelineTimelineProps) {
  return (
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
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300",
                  isCompleted &&
                    "bg-success border-success text-success-foreground",
                  isActive &&
                    "bg-primary border-primary text-primary-foreground shadow-md",
                  isPending &&
                    "bg-muted/50 border-border text-muted-foreground"
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

              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px] transition-colors duration-300",
                    isCompleted ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>

            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    "font-medium text-sm",
                    isActive && "text-primary",
                    isCompleted && "text-foreground",
                    isPending && "text-muted-foreground"
                  )}
                >
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
              <p
                className={cn(
                  "text-xs mt-0.5",
                  isPending
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground"
                )}
              >
                {step.description}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function PipelineTimeline(props: PipelineTimelineProps) {
  return (
    <>
      <DesktopTimeline {...props} />
      <TabletTimeline {...props} />
      <MobileTimeline {...props} />
    </>
  );
}
