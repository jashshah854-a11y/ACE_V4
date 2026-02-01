import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRunsList, useRunStatus } from "@/lib/queries";

const PAGE_SIZE = 20;

export default function ReportsListPage() {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useRunsList(PAGE_SIZE, offset);

  const runs = data?.runs ?? [];
  const hasMore = data?.has_more ?? false;
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-destructive mb-4">
          {error instanceof Error ? error.message : "Failed to load reports"}
        </p>
        <Button onClick={() => navigate("/")}>New Analysis</Button>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              {total} total run{total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button asChild>
          <Link to="/">New Analysis</Link>
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No reports yet</p>
          <Button asChild>
            <Link to="/">Upload Data</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((runId) => (
            <RunCard key={runId} runId={runId} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(offset > 0 || hasMore) && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </main>
  );
}

function RunCard({ runId }: { runId: string }) {
  const { data: status } = useRunStatus(runId);
  const navigate = useNavigate();

  const isRunning =
    status?.status === "pending" || status?.status === "running";
  const isComplete =
    status?.status === "completed" ||
    status?.status === "complete" ||
    status?.status === "complete_with_errors";
  const isFailed = status?.status === "failed";

  const target = isRunning ? `/pipeline/${runId}` : `/report/${runId}`;

  const statusBadge = () => {
    if (!status) return null;
    const s = status.status;
    const cls =
      isComplete
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
        : isRunning
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          : isFailed
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
            : "bg-muted text-muted-foreground";
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
        {s}
      </span>
    );
  };

  return (
    <button
      onClick={() => navigate(target)}
      className="w-full text-left bg-card rounded-lg border p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="font-mono text-sm truncate">{runId}</p>
          {status?.created_at && (
            <p className="text-xs text-muted-foreground">
              {new Date(status.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
      {statusBadge()}
    </button>
  );
}
