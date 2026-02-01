import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Trash2 } from "lucide-react";

interface Report {
    run_id: string;
    timestamp: string;
    status: string;
    filename?: string;
}

export default function SimpleReportList() {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const response = await fetch("http://localhost:8000/runs");
            if (!response.ok) throw new Error("Failed to fetch reports");
            const data = await response.json();
            setReports(data.runs || []);
        } catch (error) {
            console.error("Failed to load reports:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (runId: string) => {
        if (!confirm("Delete this report?")) return;

        try {
            await fetch(`http://localhost:8000/run/${runId}`, { method: "DELETE" });
            setReports(reports.filter(r => r.run_id !== runId));
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <nav className="border-b bg-white dark:bg-slate-900 px-4 py-3">
                <div className="container mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold">Reports</h1>
                    <Button onClick={() => navigate("/")}>New Analysis</Button>
                </div>
            </nav>

            <main className="container mx-auto max-w-4xl px-4 py-8">
                {reports.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 mb-4">No reports yet</p>
                        <Button onClick={() => navigate("/")}>Upload Data</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map((report) => (
                            <div
                                key={report.run_id}
                                className="bg-white dark:bg-slate-900 rounded-lg border p-4 flex items-center justify-between hover:border-blue-300 transition-colors"
                            >
                                <button
                                    onClick={() => navigate(`/report/${report.run_id}`)}
                                    className="flex-1 text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium">{report.filename || "Analysis Report"}</p>
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                <code className="font-mono">{report.run_id.slice(0, 8)}</code>
                                                <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                                                <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${report.status === "complete" ? "bg-green-100 text-green-800" : ""}
                          ${report.status === "processing" ? "bg-blue-100 text-blue-800" : ""}
                          ${report.status === "error" ? "bg-red-100 text-red-800" : ""}
                        `}>
                                                    {report.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(report.run_id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
