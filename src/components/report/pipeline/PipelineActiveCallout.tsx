/**
 * Callout banner showing the currently active pipeline step.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SafeIcon } from "@/components/ui/SafeIcon";
import { PIPELINE_STEPS, type StepState } from "./types";

interface PipelineActiveCalloutProps {
  stepStates: Record<string, StepState>;
  isComplete: boolean;
  isFailed: boolean;
}

export function PipelineActiveCallout({
  stepStates,
  isComplete,
  isFailed,
}: PipelineActiveCalloutProps) {
  const activeStepIndex = PIPELINE_STEPS.findIndex(
    (step) => stepStates[step.key] === "active"
  );
  const activeStep =
    activeStepIndex >= 0 ? PIPELINE_STEPS[activeStepIndex] : null;

  return (
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
              <SafeIcon
                icon={activeStep.icon}
                className="w-6 h-6 text-primary"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">
                  {activeStep.label}
                </span>
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {activeStep.description}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-primary">
                Step {activeStepIndex + 1}
              </span>
              <span className="text-sm text-muted-foreground">
                {" "}
                of {PIPELINE_STEPS.length}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
