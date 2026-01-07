import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    Circle,
    Loader2,
    AlertCircle,
    Clock,
    ArrowDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStep, RunState } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PipelineVisualizerProps {
    runState: RunState;
    className?: string;
}

const STEP_LABELS: Record<string, string> = {
    "profiling": "Data Sentry Inspection",
    "context": "Strategic Context Analysis",
    "processing": "Core Intelligence Processing",
    "generation": "Report Generation",
    "complete": "Mission Complete"
};

const STEP_DESCRIPTIONS: Record<string, string> = {
    "profiling": "Validating schema, checking data quality, and identifying key entities.",
    "context": "Aligning analysis with business objectives and decision criteria.",
    "processing": "The Overseer is orchestrating agent swarms to derive insights.",
    "generation": "Compiling findings into the final Executive Pulse report.",
    "complete": "Analysis ready for review."
};

export function PipelineVisualizer({ runState, className }: PipelineVisualizerProps) {
    const steps = runState.steps || [];

    // Helper to determine step status
    const getStepStatus = (stepName: string, index: number) => {
        const step = steps.find(s => s.name === stepName);
        if (step) return step.status;

        // Fallback if step not explicitly in list (shouldn't happen with correct backend)
        const currentStepIndex = steps.findIndex(s => s.name === runState.current_step);
        if (index < currentStepIndex) return "completed";
        if (index === currentStepIndex) return "running";
        return "pending";
    };

    return (
        <Card className={cn("border-border/40 bg-card/50 backdrop-blur-sm", className)}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Loader2 className={cn("w-5 h-5", runState.status === "running" ? "animate-spin text-teal-500" : "text-muted-foreground")} />
                    Analysis Pipeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative space-y-0 text-sm">
                    {/* Vertical Line Background */}
                    <div className="absolute left-6 top-4 bottom-4 w-px bg-border/50" />

                    {steps.map((step, idx) => {
                        const label = STEP_LABELS[step.name] || step.name;
                        const description = STEP_DESCRIPTIONS[step.name] || "Processing...";
                        const isLast = idx === steps.length - 1;

                        return (
                            <div key={step.name} className="relative pl-14 pb-8 last:pb-0 group">
                                {/* Status Icon */}
                                <div className={cn(
                                    "absolute left-0 top-0 w-12 h-12 rounded-full border-4 border-background flex items-center justify-center transition-colors duration-500",
                                    step.status === "completed" ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" :
                                        step.status === "running" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" :
                                            step.status === "failed" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                                "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                                )}>
                                    {step.status === "completed" && <CheckCircle2 className="w-6 h-6" />}
                                    {step.status === "running" && <Loader2 className="w-6 h-6 animate-spin" />}
                                    {step.status === "failed" && <AlertCircle className="w-6 h-6" />}
                                    {step.status === "pending" && <Circle className="w-6 h-6" />}
                                </div>

                                {/* Content */}
                                <div className={cn(
                                    "flex flex-col gap-1 transition-opacity duration-500",
                                    step.status === "pending" ? "opacity-50" : "opacity-100"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <h4 className={cn(
                                            "font-semibold text-base",
                                            step.status === "running" ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                                        )}>
                                            {label}
                                        </h4>
                                        {step.status === "running" && (
                                            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 animate-pulse bg-blue-100/50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                                ACTIVE
                                            </span>
                                        )}
                                        {step.status === "completed" && (
                                            <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Done
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-muted-foreground leading-relaxed">
                                        {description}
                                    </p>

                                    {/* Progress Bar for Running Step */}
                                    {step.status === "running" && (
                                        <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: "0%" }}
                                                animate={{ width: "100%" }}
                                                transition={{ duration: 20, ease: "linear", repeat: Infinity }} // Simulated progress
                                                className="h-full bg-blue-500 rounded-full"
                                            />
                                        </div>
                                    )}

                                    {/* Error Message */}
                                    {step.status === "failed" && step.error && (
                                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-sm font-mono">
                                            Error: {step.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
