import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface ReportState {
    status: "processing" | "complete" | "error" | "pending";
    metrics?: Record<string, unknown>;
    current_step?: string;
    progress?: number;
}

interface ReportData {
    state: ReportState;
    markdown: string | null;
}

async function fetchReportData(runId: string): Promise<ReportData> {
    const [stateRes, markdownRes] = await Promise.all([
        fetch(`/api/run/${runId}/state`),
        fetch(`/api/run/${runId}/markdown`),
    ]);

    if (!stateRes.ok) {
        throw new Error("Failed to fetch report state");
    }

    const state = await stateRes.json();
    const markdown = markdownRes.ok ? await markdownRes.text() : null;

    return { state, markdown };
}

export default function SimpleReport() {
    const { runId } = useParams<{ runId: string }>();
    const navigate = useNavigate();

    const { data, isLoading, error } = useQuery({
        queryKey: ["report", runId],
        queryFn: () => fetchReportData(runId!),
        enabled: !!runId,
        // Only poll while processing - stop when complete
        refetchInterval: (query) => {
            const status = query.state.data?.state?.status;
            return status === "processing" || status === "pending" ? 3000 : false;
        },
        retry: 2,
        staleTime: 5000,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-slate-600 dark:text-slate-400">Loading report...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Report</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        {error instanceof Error ? error.message : "Report not found"}
                    </p>
                    <Button onClick={() => navigate("/")}>Return Home</Button>
                </div>
            </div>
        );
    }

    const { state, markdown } = data;
    const isProcessing = state.status === "processing" || state.status === "pending";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <nav className="border-b bg-white dark:bg-slate-900 px-4 py-3 sticky top-0 z-10">
                <div className="container mx-auto flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate("/reports")}>
                        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                        Back to Reports
                    </Button>
                    <code className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                        {runId?.slice(0, 8)}
                    </code>
                </div>
            </nav>

            <main className="container mx-auto max-w-4xl px-4 py-8">
                {isProcessing && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                            <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                    Analysis in progress...
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {state.current_step
                                        ? `Current step: ${state.current_step}`
                                        : "This page will update automatically when complete."}
                                </p>
                            </div>
                        </div>
                        {typeof state.progress === "number" && (
                            <div className="mt-3 bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, state.progress)}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {state.status === "error" && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <div>
                                <p className="font-medium text-red-900 dark:text-red-100">
                                    Analysis failed
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    An error occurred during processing.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {markdown ? (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border p-8">
                        <article className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>{markdown}</ReactMarkdown>
                        </article>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border p-8 text-center text-slate-500 dark:text-slate-400">
                        <p>No summary available yet. The analysis is still processing.</p>
                    </div>
                )}

                {state.metrics && Object.keys(state.metrics).length > 0 && (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg border p-6">
                        <h3 className="text-lg font-bold mb-4">Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(state.metrics).map(([key, value]) => (
                                <div key={key} className="border rounded p-3">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{key}</p>
                                    <p className="text-lg font-semibold">{String(value)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
