import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, Clipboard, Download, RefreshCw } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { ReportViewer } from "@/components/runs/ReportViewer";
import { useRunArtifacts, useRunState } from "@/hooks/use-run-data";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl, isTerminalStatus, type RunState } from "@/lib/api-client";
import { PIPELINE_STEPS } from "@/lib/pipeline";

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || Number.isNaN(seconds)) return "—";
  const totalSeconds = Math.max(0, Math.round(seconds));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const computeRunDuration = (state?: RunState) => {
  if (!state?.created_at || !state?.updated_at) return undefined;
  return (Date.parse(state.updated_at) - Date.parse(state.created_at)) / 1000;
};

const ARTIFACT_LABELS = {
  schema: "Schema Map",
  overseer: "Overseer Output",
  personas: "Personas",
  strategies: "Strategies",
  anomalies: "Anomalies",
  finalReport: "Final Report",
} as const;

type ArtifactKey = keyof typeof ARTIFACT_LABELS;

const RunDetail = () => {
  const { runId } = useParams<{ runId: string }>();
  const { toast } = useToast();

  const runStateQuery = useRunState(runId, { pollWhilePending: true });
  const runState = runStateQuery.data;
  const isComplete = isTerminalStatus(runState?.status);
  const artifactsQuery = useRunArtifacts(runId, { enabled: isComplete });
  const finalReport = artifactsQuery.data?.finalReport ?? null;

  const pipelineSteps = useMemo(() => buildPipelineTimeline(runState), [runState]);
  const history = runState?.history ?? [];
  const runDurationSeconds = computeRunDuration(runState);
  const relativeUpdate = runState?.updated_at
    ? formatDistanceToNowStrict(new Date(runState.updated_at), { addSuffix: true })
    : null;
  const dataFileName = runState?.data_path?.split(/[/\\]/).pop() ?? "cleaned_uploaded.csv";

  const handleCopy = async () => {
    if (!runId) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(runId);
      } else {
        throw new Error("Clipboard unavailable");
      }
      toast({
        title: "Run ID copied",
        description: runId,
      });
    } catch (error) {
      toast({
        title: "Unable to copy",
        description: error instanceof Error ? error.message : "Copy failed",
        variant: "destructive",
      });
    }
  };

  if (!runId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4">
            <Card>
              <CardHeader>
                <CardTitle>Run not found</CardTitle>
                <CardDescription>Provide a run ID in the URL to inspect its state.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/runs">Return to runs</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 space-y-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/runs">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to runs
              </Link>
            </Button>
            {runStateQuery.isFetching && !isComplete && (
              <span className="text-xs text-muted-foreground">Live polling...</span>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Run ID</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-3xl font-semibold">{runId}</h1>
                <RunStatusBadge status={runState?.status ?? "pending"} size="md" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Created {formatDateTime(runState?.created_at)} · Updated {formatDateTime(runState?.updated_at)}
                {relativeUpdate ? ` (${relativeUpdate})` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Clipboard className="mr-2 h-4 w-4" /> Copy ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runStateQuery.refetch()}
                disabled={runStateQuery.isFetching}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {runStateQuery.isFetching ? "Refreshing" : "Refresh"}
              </Button>
              <Button size="sm" variant="hero" asChild disabled={!isComplete}>
                <a href={`${getApiBaseUrl()}/runs/${runId}/report`} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4" /> Download report
                </a>
              </Button>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Pipeline status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold capitalize">{runState?.status ?? "pending"}</p>
                <p className="text-sm text-muted-foreground">
                  {runState?.steps_completed?.length ?? 0} / {PIPELINE_STEPS.length} steps completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatDuration(runDurationSeconds)}</p>
                <p className="text-sm text-muted-foreground">Started {formatDateTime(runState?.created_at)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Data source</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{dataFileName}</p>
                <p className="text-sm text-muted-foreground">Stored in run directory.</p>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Pipeline timeline</CardTitle>
                <CardDescription>Live status for each ACE agent across the orchestration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {pipelineSteps.map((step, index) => (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <span className="h-3 w-3 rounded-full border border-border bg-background" />
                        <span
                          className={`absolute h-3 w-3 rounded-full ${
                            step.status === "completed" || step.status === "complete"
                              ? "bg-emerald-500/70"
                              : step.status === "running"
                              ? "bg-sky-500/70"
                              : step.status === "failed"
                              ? "bg-destructive/70"
                              : "bg-muted"
                          }`}
                        />
                      </span>
                      {index < pipelineSteps.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
                    </div>
                    <div className="flex-1 rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{step.label}</p>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <RunStatusBadge status={step.status ?? "pending"} />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase">Started</p>
                          <p className="font-medium text-foreground">{formatDateTime(step.started_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase">Completed</p>
                          <p className="font-medium text-foreground">{formatDateTime(step.completed_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase">Runtime</p>
                          <p className="font-medium text-foreground">{formatDuration(step.runtime_seconds)}</p>
                        </div>
                      </div>
                      {step.stdout_tail && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-muted-foreground">Stdout</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                            {step.stdout_tail}
                          </pre>
                        </div>
                      )}
                      {step.stderr_tail && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-destructive">Stderr</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                            {step.stderr_tail}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

                    <section className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold">Final report</h2>
              <p className="text-sm text-muted-foreground">
                Review the orchestrator's final markdown deliverable with headings, tables, and callouts.
              </p>
            </div>
            <ReportViewer
              content={finalReport}
              isLoading={isComplete && artifactsQuery.isFetching}
              emptyState={isComplete ? "Report not generated for this run." : "Report will appear after the pipeline finishes."}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Artifacts</CardTitle>
                <CardDescription>Downloadable outputs become available once the pipeline completes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(ARTIFACT_LABELS).map(([key, label]) => {
                  const value = artifactsQuery.data?.[key as ArtifactKey];
                  const available = Boolean(value);
                  return (
                    <div key={key} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          {available ? "Ready" : isComplete ? "Not generated" : "Pending"}
                        </p>
                      </div>
                      <RunStatusBadge status={available ? "completed" : "pending"} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event history</CardTitle>
                <CardDescription>Log of orchestrator events in chronological order.</CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history entries yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry, index) => (
                        <TableRow key={`${entry.timestamp}-${index}`}>
                          <TableCell className="whitespace-nowrap text-sm">{formatDateTime(entry.timestamp)}</TableCell>
                          <TableCell className="text-sm font-medium">{entry.event}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {Object.entries(entry)
                              .filter(([key]) => key !== "timestamp" && key !== "event")
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ") || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function buildPipelineTimeline(state?: RunState) {
  const steps = state?.steps ?? {};
  return PIPELINE_STEPS.map((definition) => ({
    ...definition,
    ...(steps[definition.id] ?? {}),
    status: steps[definition.id]?.status ?? "pending",
  }));
}

export default RunDetail;






