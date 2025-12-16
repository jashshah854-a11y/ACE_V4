import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getRunState, RunState } from "@/lib/api-client";
import { cn } from "@/lib/utils";
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
  { key: "ingestion", label: "Data Ingestion", icon: Database },
  { key: "scanner", label: "Schema Analysis", icon: Cpu },
  { key: "clustering", label: "Behavioral Clustering", icon: Users },
  { key: "anomaly", label: "Anomaly Detection", icon: AlertTriangle },
  { key: "personas", label: "Persona Generation", icon: Sparkles },
  { key: "report", label: "Report Generation", icon: FileText },
];

const getStepIndex = (currentStep?: string): number => {
  if (!currentStep) return -1;
  const stepLower = currentStep.toLowerCase();
  const index = PIPELINE_STEPS.findIndex(
    (s) => stepLower.includes(s.key) || s.key.includes(stepLower)
  );
  return index >= 0 ? index : 0;
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case "completed":
    case "complete":
      return "text-success";
    case "failed":
    case "complete_with_errors":
      return "text-destructive";
    case "running":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
};

export function PipelineStatus({ runId, onComplete }: PipelineStatusProps) {
  const { data: state, isLoading } = useQuery<RunState>({
    queryKey: ["run-state", runId],
    queryFn: () => getRunState(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "complete" || status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds while running
    },
  });

  // Trigger onComplete when done
  const isComplete = state?.status === "completed" || state?.status === "complete";
  const isFailed = state?.status === "failed" || state?.status === "complete_with_errors";

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

  const currentStepIndex = getStepIndex(state.current_step);
  const progress = state.progress ?? (currentStepIndex >= 0 ? ((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100 : 0);

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
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
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
              Run ID: <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{runId}</code>
            </p>
          </div>
        </div>
        <div className={cn("text-2xl font-bold", getStatusColor(state.status))}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isComplete ? "bg-success" : isFailed ? "bg-destructive" : "gradient-meridian"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {PIPELINE_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex || isComplete;
          const isPending = index > currentStepIndex && !isComplete;
          const Icon = step.icon;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10 border border-primary/20",
                isCompleted && !isActive && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                  isActive && "gradient-meridian text-white",
                  isCompleted && !isActive && "bg-success/10 text-success",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isActive && !isComplete ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive && "text-primary",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </div>
              {isActive && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Clock className="w-3 h-3" />
                  <span>Processing</span>
                </div>
              )}
              {isCompleted && !isActive && (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current Step Detail */}
      {state.current_step && !isComplete && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Current: <span className="text-foreground font-medium">{state.current_step}</span>
            {state.next_step && (
              <>
                {" → Next: "}
                <span className="text-muted-foreground">{state.next_step}</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Error Message */}
      {state.error && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}
    </motion.div>
  );
}
