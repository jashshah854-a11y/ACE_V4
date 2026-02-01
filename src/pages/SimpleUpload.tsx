import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { submitRun } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SimpleUpload() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const taskIntent = {
                primaryQuestion: "Analyze this dataset",
                decisionContext: "General analysis",
                requiredOutputType: "diagnostic" as const,
                successCriteria: "Identify key patterns",
                constraints: "",
                confidenceThreshold: 85,
                confidenceAcknowledged: true,
                forbidden_claims: [],
                strict_mode: false,
            };

            const result = await submitRun(file, taskIntent);
            toast.success("Analysis started");
            navigate(`/report/${result.run_id}`);
        } catch (error) {
            toast.error("Upload failed. Please try again.");
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <nav className="border-b bg-white dark:bg-slate-900 px-4 py-3">
                <div className="container mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold">ACE Analysis</h1>
                    <Button variant="ghost" onClick={() => navigate("/reports")}>
                        View Reports
                    </Button>
                </div>
            </nav>

            <main className="container mx-auto max-w-2xl px-4 py-16">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">Upload Your Data</h2>
                    <p className="text-slate-600">Drop a CSV, Excel, or Parquet file to start analysis</p>
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            relative rounded-lg border-2 border-dashed p-12 text-center transition-colors
            ${isDragging
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "border-slate-300 hover:border-slate-400"
                        }
          `}
                >
                    {/* Only show file input when no file is selected */}
                    {!file && (
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept=".csv,.xlsx,.xls,.parquet"
                            disabled={uploading}
                        />
                    )}

                    <Upload className={`mx-auto h-12 w-12 mb-4 ${file ? "text-green-500" : "text-slate-400"}`} />

                    {file ? (
                        <div className="space-y-4">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                                {file.name}
                            </p>
                            <p className="text-sm text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                    disabled={uploading}
                                >
                                    Change File
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubmit();
                                    }}
                                    disabled={uploading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Starting Analysis...
                                        </>
                                    ) : (
                                        "Start Analysis"
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-medium mb-2">Drop file here or click to browse</p>
                            <p className="text-sm text-slate-500">CSV, Excel, or Parquet files supported</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-sm text-slate-500">
                    <p>Your data is processed securely and never stored permanently.</p>
                </div>
            </main>
        </div>
    );
}
