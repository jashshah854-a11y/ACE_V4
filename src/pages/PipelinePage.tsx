import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Brain,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepList } from "@/components/pipeline/StepList";
import { useRunStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

const STEP_CONTEXT: Record<string, string> = {
  ingestion: "Sanitizing and preparing your data for analysis",
  type_identifier: "Detecting what kind of dataset this is",
  scanner: "Profiling every column for distributions and outliers",
  interpreter: "Building a semantic schema map of your data",
  validator: "Checking data quality and sufficiency",
  overseer: "Finding natural clusters and behavioral segments",
  regression: "Building predictive models on key outcomes",
  time_series: "Detecting temporal patterns and trends",
  sentry: "Hunting for anomalies and suspicious patterns",
  personas: "Generating data-driven customer personas",
  fabricator: "Crafting strategic recommendations",
  raw_data_sampler: "Sampling real rows for deep LLM analysis",
  deep_insight: "Synthesizing cross-artifact patterns with AI",
  dot_connector: "Linking findings into a unified narrative",
  hypothesis_engine: "Generating bold, testable hypotheses",
  so_what_deepener: "Asking 'so what?' three levels deep",
  story_framer: "Building the narrative arc of your data story",
  executive_narrator: "Polishing insights for executive consumption",
  expositor: "Assembling the final intelligence report",
  trust_evaluation: "Scoring confidence and flagging limitations",
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function PulseRing({ progress }: { progress: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-secondary"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-teal-400 tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
      {progress < 100 && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-teal-500/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export default function PipelinePage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: status, isLoading, error } = useRunStatus(runId);

  const [elapsed, setElapsed] = useState(0);

  const computeElapsed = useCallback(() => {
    if (status?.start_epoch) {
      return Math.floor(Date.now() / 1000 - status.start_epoch);
    }
    return 0;
  }, [status?.start_epoch]);

  useEffect(() => {
    setElapsed(computeElapsed());
  }, [computeElapsed]);

  useEffect(() => {
    const isRunning = status?.status === "running" || status?.status === "queued";
    if (isRunning) {
      const interval = setInterval(() => {
        setElapsed(computeElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status?.status, computeElapsed]);

  const isComplete = status?.status === "completed" || status?.status === "complete";

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        navigate(`/report/${runId}`, { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, runId, navigate]);

  const contextMessage = useMemo(() => {
    if (!status?.current_step) return null;
    return STEP_CONTEXT[status.current_step] ?? null;
  }, [status?.current_step]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <Brain className="w-10 h-10 text-teal-500" />
            <motion.div
              className="absolute -inset-2 rounded-full border border-teal-500/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <span className="text-muted-foreground text-sm">Connecting to pipeline...</span>
        </motion.div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-4">
        <XCircle className="w-8 h-8 text-destructive" />
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load pipeline status"}
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Upload
        </Button>
      </div>
    );
  }

  const progress = status.progress ?? 0;
  const isFailed = status.status === "failed";
  const completedCount = status.completed_steps ?? 0;
  const totalCount = status.total_steps ?? 20;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Hero section with ring */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <PulseRing progress={isComplete ? 100 : progress} />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : isFailed ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : (
                <Zap className="w-5 h-5 text-teal-500" />
              )}
              <h1 className="text-2xl font-bold">
                {isComplete
                  ? "Analysis Complete"
                  : isFailed
                    ? "Analysis Failed"
                    : "Analyzing Your Data"}
              </h1>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Run{" "}
              <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                {runId}
              </code>
              <span className="mx-2 text-border">|</span>
              <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
              <span className="font-mono">{formatElapsed(elapsed)}</span>
            </p>

            {/* Contextual step description */}
            <AnimatePresence mode="wait">
              {contextMessage && !isComplete && !isFailed && (
                <motion.div
                  key={status.current_step}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-sm text-teal-400/80"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{contextMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {status.current_stage && !isComplete && !isFailed && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Stage: {status.current_stage}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">
              {completedCount}/{totalCount} agents complete
            </span>
            {!isComplete && !isFailed && (
              <span className="text-xs text-muted-foreground/50">
                ~{Math.max(1, Math.round(((100 - progress) / Math.max(progress, 1)) * (elapsed || 1)))}s remaining
              </span>
            )}
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isComplete && "bg-green-500",
                isFailed && "bg-destructive",
                !isComplete && !isFailed && "bg-gradient-to-r from-teal-600 to-cyan-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${isComplete ? 100 : progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step list */}
        <div className="rounded-xl border border-border bg-card p-4">
          <StepList
            currentStep={status.current_step}
            stepsCompleted={status.steps_completed || []}
            status={status.status}
          />
        </div>

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">All 20 agents finished successfully</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting to your intelligence report...
            </p>
          </motion.div>
        )}

        {isFailed && (
          <div className="mt-2 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive text-center">
              The pipeline encountered an error. You can retry or go back.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to Upload
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-teal-600 hover:bg-teal-500 text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
