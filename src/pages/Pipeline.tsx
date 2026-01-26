import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ThinkingView } from "@/components/thinking/ThinkingView";
import { Home, ChevronRight, Upload, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRunStatus, type RunState } from "@/lib/api-client";
import { PipelineVisualizer } from "@/components/report/PipelineVisualizer";
import { useRunSnapshot } from "@/hooks/useRunSnapshot";

import { getDiagnosticsCache, removeDiagnosticsCache, extractDiagnosticsNotes, type DiagnosticsCachePayload } from "@/lib/localStorage";

// Vercel Build Fix: Forced State Refresh
// Wrapper component to poll run state and pass to Visualizer
function ThinkingViewWithPolling({ runId, onComplete }: { runId: string; onComplete: () => void }) {
  const [runState, setRunState] = useState<RunState | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollState = async () => {
      try {
        const state = await getRunStatus(runId);
        setRunState(state);

        if (state.status === "complete" || state.status === "completed" || state.status === "complete_with_errors") {
          clearInterval(interval);
          setTimeout(onComplete, 2000); // Allow user to see the green checkmark
        }
      } catch (error) {
        console.error("Error polling run state:", error);
      }
    };

    pollState(); // Initial fetch
    interval = setInterval(pollState, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [runId, onComplete]);

  if (!runState) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4" />
        <p className="text-muted-foreground">Initializing Pipeline Connection...</p>
        <p className="text-xs text-muted-foreground mt-4 font-mono opacity-70">
          ID: {runId} | Status: {runState ? (runState as RunState).status : "Connecting..."}
        </p>
      </div>
    );
  }

  if (runState.status === "complete" || runState.status === "completed" || runState.status === "complete_with_errors") {
    // Keep showing visualizer in completed state briefly before redirect
    return (
      <div className="space-y-8">
        <PipelineVisualizer runState={runState} />
        <NeuralReasoningStream steps={runState.steps} />
        <div className="text-center animate-fade-in-up">
          <p className="text-teal-600 font-medium mb-4">Analysis Finalized. Preparing Report...</p>
          <Button
            onClick={onComplete}
            variant="default"
            className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg animate-pulse"
          >
            Open Report Now (Click if stuck)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PipelineVisualizer runState={runState} />
      <NeuralReasoningStream steps={runState.steps} />
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-mono opacity-50">
          Debug: {runId} is {runState.status}
        </p>
      </div>
    </div>
  );
}


function NeuralReasoningStream({ steps }: { steps?: PipelineStep[] }) {
  const normalizedSteps = Array.isArray(steps) ? steps : [];
  if (normalizedSteps.length === 0) {
    return null;
  }
  const STATUS_COPY: Record<string, string> = {
    pending: "Queued for analysis",
    running: "Listening to your data",
    completed: "Logged",
    failed: "Requires attention",
  };
  return (
    <div className="mt-6 rounded-2xl border border-border/40 bg-card/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">Reasoning Stream</p>
      <div className="space-y-2">
        {normalizedSteps.map((step) => {
          const status = step.status || "pending";
          const isDone = status === "completed";
          const isRunning = status === "running";
          return (
            <div key={`${step.name}-${status}`} className="flex items-center gap-3">
              {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              {isRunning && !isDone && <Loader2 className="h-4 w-4 text-action animate-spin" />}
              {!isDone && !isRunning && <span className="h-2 w-2 rounded-full bg-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{step.name}</p>
                <p className="text-xs text-muted-foreground">{STATUS_COPY[status] || "Tracking"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: snapshot } = useRunSnapshot(runId, true);
  const diagnostics = snapshot?.diagnostics ?? null;
  const [guidanceNotes, setGuidanceNotes] = useState<string[]>([]);

  const clearDiagnosticsCache = useCallback(() => {
    if (!runId) return;
    removeDiagnosticsCache(runId);
  }, [runId]);

  const refreshGuidanceNotes = useCallback(() => {
    if (!runId) {
      setGuidanceNotes([]);
      return;
    }
    const payload: DiagnosticsCachePayload | null = diagnostics
      ? (diagnostics as unknown as DiagnosticsCachePayload)
      : getDiagnosticsCache(runId);
    setGuidanceNotes(extractDiagnosticsNotes(payload));
  }, [diagnostics, runId]);

  useEffect(() => {
    refreshGuidanceNotes();
  }, [refreshGuidanceNotes]);

  const handleComplete = () => {
    // Navigate to report when analysis completes
    if (runId) {
      clearDiagnosticsCache();
      navigate(`/report/summary?run=${runId}`);
    }
  };

  // If no runId, show error state
  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-5 w-5" />
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Analysis Pipeline</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <Card className="border-destructive/50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">There is nothing to learn yet.</h2>
                    <p className="text-muted-foreground mb-6">
                      There is no active story for ACE to interpret yet. Begin by uploading a dataset so the Overseer can listen.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/upload">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Data
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-5 w-5" />
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Analysis Pipeline</h1>
            </div>
            <code className="text-xs font-mono text-muted-foreground bg-muted/60 px-2 py-1 rounded">
              {runId.slice(0, 12)}...
            </code>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div
          data-guidance-context="global"
          className="mb-6 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900"
        >
          <Lightbulb className="h-4 w-4 mt-0.5" />
          <div>
            <p className="font-semibold">Trust guidance lives in Executive Pulse</p>
            {guidanceNotes.length ? (
              <ul className="mt-1 space-y-1 text-xs text-amber-700">
                {guidanceNotes.slice(0, 3).map((note, idx) => (
                  <li key={`pipeline-guidance-${idx}`}>- {note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-700">
                When Safe Mode triggers, the global banner will jump to this card even before the report opens.
              </p>
            )}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <ThinkingViewWithPolling runId={runId} onComplete={handleComplete} />
        </motion.div>

        {/* Back to upload link */}
        <div className="text-center mt-8">
          <Link
            to="/upload"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Upload
          </Link>
        </div>
      </main>
    </div>
  );
}










