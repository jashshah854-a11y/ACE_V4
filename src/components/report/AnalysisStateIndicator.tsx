import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AnalysisState = "idle" | "analyzing" | "partial" | "complete" | "failed";

interface AnalysisStateIndicatorProps {
    state: AnalysisState;
    progress?: number;
    currentStage?: string;
    stagesComplete?: number;
    totalStages?: number;
    message?: string;
    error?: string;
    className?: string;
}

export function AnalysisStateIndicator({
    state,
    progress = 0,
    currentStage,
    stagesComplete = 0,
    totalStages = 5,
    message,
    error,
    className
}: AnalysisStateIndicatorProps) {
    const stateConfig = {
        idle: {
            icon: Clock,
            color: "text-slate-500",
            bg: "bg-slate-50 dark:bg-slate-900/20",
            border: "border-slate-200 dark:border-slate-800",
            label: "Ready",
            description: "Waiting to start analysis"
        },
        analyzing: {
            icon: Loader2,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/20",
            border: "border-blue-200 dark:border-blue-800",
            label: "Analyzing",
            description: "Processing your data..."
        },
        partial: {
            icon: TrendingUp,
            color: "text-yellow-600 dark:text-yellow-400",
            bg: "bg-yellow-50 dark:bg-yellow-950/20",
            border: "border-yellow-200 dark:border-yellow-800",
            label: "Partial Results",
            description: "Some insights available, still processing"
        },
        complete: {
            icon: CheckCircle2,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/20",
            border: "border-green-200 dark:border-green-800",
            label: "Complete",
            description: "Analysis finished successfully"
        },
        failed: {
            icon: AlertCircle,
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950/20",
            border: "border-red-200 dark:border-red-800",
            label: "Failed",
            description: "Analysis encountered an error"
        }
    };

    const config = stateConfig[state];
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-lg border-2 p-4",
                config.bg,
                config.border,
                className
            )}
        >
            <div className="flex items-start gap-4">
                <div className={cn("mt-1", state === "analyzing" && "animate-spin")}>
                    <Icon className={cn("h-6 w-6", config.color)} />
                </div>

                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className={cn("font-semibold text-sm", config.color)}>
                                {config.label}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {message || config.description}
                            </p>
                        </div>
                        <Badge variant="outline" className={cn("font-mono", config.color)}>
                            {stagesComplete}/{totalStages}
                        </Badge>
                    </div>

                    {state === "analyzing" && (
                        <>
                            <Progress value={progress} className="h-2" />
                            {currentStage && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    <span>Current: {currentStage}</span>
                                </div>
                            )}
                        </>
                    )}

                    {state === "partial" && (
                        <div className="flex items-center gap-2 text-xs">
                            <Progress value={(stagesComplete / totalStages) * 100} className="h-2 flex-1" />
                            <span className="text-muted-foreground">
                                {Math.round((stagesComplete / totalStages) * 100)}%
                            </span>
                        </div>
                    )}

                    {state === "failed" && error && (
                        <div className="p-3 rounded bg-background/50 border border-red-200 dark:border-red-800">
                            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {state === "complete" && (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>All {totalStages} stages completed successfully</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

interface StageItem {
    name: string;
    status: "pending" | "running" | "complete" | "failed";
    duration?: string;
}

interface PipelineStagesProps {
    stages: StageItem[];
    className?: string;
}

export function PipelineStages({ stages, className }: PipelineStagesProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {stages.map((stage, index) => {
                const statusConfig = {
                    pending: {
                        icon: Clock,
                        color: "text-slate-400",
                        bg: "bg-slate-100 dark:bg-slate-800"
                    },
                    running: {
                        icon: Loader2,
                        color: "text-blue-600 dark:text-blue-400",
                        bg: "bg-blue-100 dark:bg-blue-900/20"
                    },
                    complete: {
                        icon: CheckCircle2,
                        color: "text-green-600 dark:text-green-400",
                        bg: "bg-green-100 dark:bg-green-900/20"
                    },
                    failed: {
                        icon: AlertCircle,
                        color: "text-red-600 dark:text-red-400",
                        bg: "bg-red-100 dark:bg-red-900/20"
                    }
                };

                const config = statusConfig[stage.status];
                const Icon = config.icon;

                return (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-2 rounded"
                    >
                        <div className={cn("p-1.5 rounded", config.bg)}>
                            <Icon className={cn("h-4 w-4", config.color, stage.status === "running" && "animate-spin")} />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-medium">{stage.name}</div>
                            {stage.duration && stage.status === "complete" && (
                                <div className="text-xs text-muted-foreground">{stage.duration}</div>
                            )}
                        </div>
                        <Badge variant="outline" className={cn("text-xs", config.color)}>
                            {stage.status}
                        </Badge>
                    </motion.div>
                );
            })}
        </div>
    );
}
