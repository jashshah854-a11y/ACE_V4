import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepList } from "@/components/pipeline/StepList";
import { useRunStatus } from "@/lib/queries";
import { cn } from "@/lib/utils";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function PipelinePage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: status, isLoading, error } = useRunStatus(runId);

  const [localElapsed, setLocalElapsed] = useState(0);

  useEffect(() => {
    if (status?.elapsed_seconds) {
      setLocalElapsed(status.elapsed_seconds);
    }
  }, [status?.elapsed_seconds]);

  useEffect(() => {
    if (status?.status === "running") {
      const interval = setInterval(() => {
        setLocalElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status?.status]);

  useEffect(() => {
    if (status?.status === "completed") {
      const timer = setTimeout(() => {
        navigate(`/report/${runId}`, { replace: true });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status?.status, runId, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Connecting to pipeline...</span>
        </div>
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

  const progress = status.progress_pct ?? 0;
  const isComplete = status.status === "completed";
  const isFailed = status.status === "failed";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : isFailed ? (
              <XCircle className="w-6 h-6 text-destructive" />
            ) : (
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            )}
            <h1 className="text-xl font-bold">
              {isComplete
                ? "Analysis Complete"
                : isFailed
                  ? "Analysis Failed"
                  : "Analyzing Your Data"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatElapsed(localElapsed)}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Run{" "}
          <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
            {runId}
          </code>
        </p>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span
              className={cn(
                "font-bold",
                isComplete && "text-green-500",
                isFailed && "text-destructive",
                !isComplete && !isFailed && "text-blue-500",
              )}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isComplete && "bg-green-500",
                isFailed && "bg-destructive",
                !isComplete && !isFailed && "bg-blue-600",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <StepList
            currentStep={status.current_step}
            stepsCompleted={status.steps_completed || []}
            status={status.status}
          />
        </div>

        {isComplete && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Redirecting to your report...
          </motion.p>
        )}

        {isFailed && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-destructive text-center">
              The pipeline encountered an error. You can retry or go back.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to Upload
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-500 text-white"
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
