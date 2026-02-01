import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadDataset, startAnalysis, type DatasetIdentity } from "@/lib/api-client";
import { DatasetIdentityCard } from "@/components/upload/DatasetIdentityCard";
import { OverseerInterview, type TaskContract } from "@/components/upload/OverseerInterview";

type Step = 1 | 2 | 3;

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [identity, setIdentity] = useState<DatasetIdentity | null>(null);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileDrop = useCallback(async (droppedFile: File) => {
    setFile(droppedFile);
    setUploading(true);
    try {
      const result = await uploadDataset(droppedFile);
      setIdentity(result);
      setStep(2);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      setFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileDrop(droppedFile);
    },
    [handleFileDrop]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileDrop(selectedFile);
  };

  const handleContractSubmit = async (contract: TaskContract) => {
    if (!file) return;
    setStarting(true);
    try {
      const taskIntent = {
        primaryQuestion: contract.primaryQuestion,
        decisionContext: contract.decisionContext,
        successCriteria: contract.successCriteria,
        forbidden_claims: contract.forbiddenClaims,
        confidenceAcknowledged: true,
      };
      const result = await startAnalysis(file, taskIntent);
      toast.success("Analysis started");
      navigate(`/pipeline/${result.run_id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start analysis");
      setStarting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  s < step ? "bg-primary/40" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: File Drop */}
      {step === 1 && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Upload Your Data</h2>
            <p className="text-muted-foreground">
              Drop a CSV, Excel, or Parquet file to start analysis
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".csv,.xlsx,.xls,.parquet"
              disabled={uploading}
            />

            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="font-medium">Analyzing {file?.name}...</p>
                <p className="text-sm text-muted-foreground">
                  Scanning schema, detecting capabilities, and assessing quality
                </p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  CSV, Excel, or Parquet files supported
                </p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Your data is processed securely and never stored permanently.
          </p>
        </div>
      )}

      {/* Step 2: Dataset Preview */}
      {step === 2 && identity && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">Dataset Identity</h2>
            <p className="text-muted-foreground text-sm">
              Review your dataset profile before configuring the analysis
            </p>
          </div>

          <DatasetIdentityCard identity={identity} />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setStep(1);
                setFile(null);
                setIdentity(null);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Upload Different File
            </Button>
            <Button onClick={() => setStep(3)}>
              Continue to Task Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Task Configuration */}
      {step === 3 && identity && (
        <div className="space-y-6">
          {starting && (
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="font-medium text-primary">Starting analysis...</p>
            </div>
          )}

          <OverseerInterview
            identity={identity}
            onSubmit={handleContractSubmit}
            onBack={() => setStep(2)}
          />
        </div>
      )}
    </main>
  );
}
