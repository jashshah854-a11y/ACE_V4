import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface ReportData {
    status: "processing" | "complete" | "error";
    summary?: string;
    metrics?: Record<string, any>;
    error?: string;
}

export default function SimpleReport() {
    const { runId } = useParams<{ runId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!runId) return;

        const fetchReport = async () => {
            try {
                const response = await fetch(`http://localhost:8000/run/${runId}/state`);
                if (!response.ok) throw new Error("Failed to fetch report");

                const state = await response.json();

                // Check if markdown report exists
                const reportResponse = await fetch(`http://localhost:8000/run/${runId}/markdown`);
                const markdown = reportResponse.ok ? await reportResponse.text() : null;

                setData({
                    status: state.status,
                    summary: markdown,
                    metrics: state.metrics,
                });
            } catch (error) {
                setData({ status: "error", error: "Failed to load report" });
            } finally {
                setLoading(false);
            }
        };

        fetchReport();

        // Poll for updates if processing
        const interval = setInterval(fetchReport, 5000);
        return () => clearInterval(interval);
    }, [runId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-slate-600">Loading report...</p>
                </div>
            </div>
        );
    }

    if (data?.status === "error" || !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Report</h2>
                    <p className="text-slate-600 mb-4">{data?.error || "Report not found"}</p>
                    <Button onClick={() => navigate("/")}>Return Home</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <nav className="border-b bg-white dark:bg-slate-900 px-4 py-3 sticky top-0 z-10">
                <div className="container mx-auto flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate("/reports")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Reports
                    </Button>
                    <code className="text-sm text-slate-600 font-mono">{runId?.slice(0, 8)}</code>
                </div>
            </nav>

            <main className="container mx-auto max-w-4xl px-4 py-8">
                {data.status === "processing" && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <div>
                                <p className="font-medium text-blue-900">Analysis in progress...</p>
                                <p className="text-sm text-blue-700">This page will update automatically when complete.</p>
                            </div>
                        </div>
                    </div>
                )}

                {data.summary ? (
                    <div className="bg-white dark:bg-slate-900 rounded-lg border p-8">
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>{data.summary}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border p-8 text-center text-slate-500">
                        <p>No summary available yet. The analysis is still processing.</p>
                    </div>
                )}

                {data.metrics && Object.keys(data.metrics).length > 0 && (
                    <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg border p-6">
                        <h3 className="text-lg font-bold mb-4">Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(data.metrics).map(([key, value]) => (
                                <div key={key} className="border rounded p-3">
                                    <p className="text-sm text-slate-600 mb-1">{key}</p>
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
