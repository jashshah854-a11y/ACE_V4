import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clipboard, Loader2, RefreshCw, Search } from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RunStatusBadge } from "@/components/runs/RunStatusBadge";
import { useListRunSummaries } from "@/hooks/use-run-data";
import { useToast } from "@/hooks/use-toast";
import { PIPELINE_STEPS } from "@/lib/pipeline";
import { isTerminalStatus } from "@/lib/api-client";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const formatDuration = (seconds?: number) => {
  if (!seconds && seconds !== 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const TOTAL_STEPS = PIPELINE_STEPS.length;

const Runs = () => {
  const { data: runs, isLoading, isFetching, refetch } = useListRunSummaries(40);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { toast } = useToast();

  const handleCopy = async (runId: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(runId);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      toast({
        title: "Run ID copied",
        description: runId,
      });
    } catch {
      toast({
        title: "Unable to copy",
        description: "Select the ID and copy it manually.",
        variant: "destructive",
      });
    }
  };

  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    const query = searchTerm.trim().toLowerCase();

    return runs.filter((run) => {
      const matchesSearch = query
        ? run.id.toLowerCase().includes(query) || run.latestEvent?.toLowerCase().includes(query)
        : true;
      const matchesFilter =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? !isTerminalStatus(run.status)
          : isTerminalStatus(run.status);

      return matchesSearch && matchesFilter;
    });
  }, [runs, searchTerm, statusFilter]);

  const totalRuns = runs?.length ?? 0;
  const activeRuns = runs?.filter((run) => !isTerminalStatus(run.status)).length ?? 0;
  const completedRuns = totalRuns - activeRuns;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 space-y-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Run Management Center</p>
              <h1 className="text-3xl font-bold tracking-tight">ACE Execution Runs</h1>
              <p className="mt-2 text-muted-foreground">
                Monitor every ACE pipeline execution, inspect statuses in real time, and jump into rich run detail views.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isFetching ? "Refreshing" : "Refresh"}
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/">
                  Launch New Run
                </Link>
              </Button>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Total Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalRuns}</p>
                <p className="text-sm text-muted-foreground">Includes the latest {totalRuns} orchestrator executions.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Active Pipelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activeRuns}</p>
                <p className="text-sm text-muted-foreground">Polling Railway backend every 15s.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{completedRuns}</p>
                <p className="text-sm text-muted-foreground">Ready for in-depth review and reporting.</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search run ID or event..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-3 md:w-auto">
                  {STATUS_FILTERS.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value}>
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-lg">Recent Runs</CardTitle>
                  <p className="text-sm text-muted-foreground">Live view of the most recent orchestrator executions.</p>
                </div>
                {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredRuns.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <p className="text-lg font-semibold">No runs to show</p>
                    <p className="text-sm text-muted-foreground">
                      Upload a dataset or adjust the filters to see ACE execution history.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm">{run.id}</p>
                              <p className="text-xs text-muted-foreground">{run.latestEvent ?? "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RunStatusBadge status={run.status} />
                          </TableCell>
                          <TableCell className="text-sm">{formatDateTime(run.createdAt)}</TableCell>
                          <TableCell className="text-sm">
                            {formatDateTime(run.updatedAt)}
                          </TableCell>
                          <TableCell className="text-sm">{formatDuration(run.durationSeconds)}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {run.completedSteps ?? 0}/{TOTAL_STEPS}
                            </div>
                            {run.failedSteps ? (
                              <div className="text-xs text-destructive">{run.failedSteps} failed</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleCopy(run.id)}>
                                <Clipboard className="h-4 w-4" />
                                <span className="sr-only">Copy run ID</span>
                              </Button>
                              <Button size="sm" asChild>
                                <Link to={`/runs/${run.id}`}>
                                  View <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
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

export default Runs;


