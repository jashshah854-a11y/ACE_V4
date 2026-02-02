import { useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PipelineStatus } from "@/components/report/PipelineStatus";

export default function PipelinePage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Called by PipelineStatus when the run reaches a terminal "complete" state.
  // Single source of truth — no duplicate polling query.
  const handleComplete = useCallback(() => {
    if (!runId || redirectTimerRef.current) return;
    redirectTimerRef.current = setTimeout(() => {
      navigate(`/report/${runId}`, { replace: true });
    }, 1500);
  }, [runId, navigate]);

  if (!runId) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Missing Run ID</h2>
        <p className="text-muted-foreground mb-4">
          No analysis run was specified.
        </p>
        <Button asChild>
          <Link to="/">Start New Analysis</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All Reports
          </Link>
        </Button>
        <code className="text-xs text-muted-foreground font-mono">
          {runId.slice(0, 8)}...
        </code>
      </div>

      <PipelineStatus runId={runId} onComplete={handleComplete} />
    </main>
  );
}
