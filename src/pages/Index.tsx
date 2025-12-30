
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { submitRun, previewDataset, DatasetIdentity } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DatasetIdentityCard } from "@/components/upload/DatasetIdentityCard";
import { OverseerInterview, TaskContract } from "@/components/upload/OverseerInterview";
import { SafeModeWarning } from "@/components/upload/SafeModeWarning";

type AnalysisStage = "upload" | "scanning" | "identity" | "contract" | "processing";

const Index = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<AnalysisStage>("upload");
  const [identity, setIdentity] = useState<DatasetIdentity | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setStage("scanning");

    try {
      const result = await previewDataset(selectedFile);
      setIdentity(result);
      setStage("identity");
      toast.success("Dataset Verified", {
        description: `Sentry scan complete. Verified ${result.row_count} rows.`
      });
    } catch (error) {
      console.error(error);
      toast.error("Scan Failed", {
        description: "Could not analyze dataset structure. Please try again."
      });
      setStage("upload");
      setFile(null);
    }
  };

  const handleProceedToContract = () => {
    if (!identity) return;
    // Check quality score for Safe Mode
    // If quality is VERY low (< 0.3), maybe reject? For now just warn.
    setStage("contract");
  };

  const handleContractSubmit = async (contract: TaskContract) => {
    if (!file) return;

    setStage("processing");
    try {
      // Map TaskContract to TaskIntentPayload expected by API
      // Note: API expects specific fields. We'll map broadly here.
      // In a real app we'd strict type this mapping.
      const taskIntent = {
        primaryQuestion: contract.primaryQuestion,
        decisionContext: contract.decisionContext,
        requiredOutputType: "diagnostic" as const, // Default to diagnostic for now
        successCriteria: "Derived from user intent",
        constraints: contract.forbiddenClaims.join(", "),
        confidenceThreshold: 80,
        confidenceAcknowledged: true,
      };

      const result = await submitRun(file, taskIntent);

      // Save to recent reports
      const { saveRecentReport } = await import("@/lib/localStorage");
      saveRecentReport(result.run_id, undefined, file.name);

      toast.success("Mission Started", {
        description: "The Overseer has authorized this analysis run.",
      });
      navigate(`/pipeline/${result.run_id}`);
    } catch (error) {
      toast.error("Mission Aborted", {
        description: "Failed to submit analysis contract.",
      });
      setStage("contract");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <main className="relative pt-24 pb-16 min-h-screen flex flex-col items-center justify-center">
        <div className="container px-4 max-w-5xl">
          {/* Hero - Only show in upload stage */}
          {stage === "upload" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Meridian Intelligence Engine</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-slate-900 dark:text-slate-50">
                Data Intelligence,
                <span className="block mt-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Autonomously Verified
                </span>
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Upload your data. The Sentry will verify its integrity, and the Overseer will ensure analytical rigor before any code runs.
              </p>
            </motion.div>
          )}

          {/* Main Content Area */}
          <div className="relative min-h-[400px]">
            <AnimatePresence mode="wait">

              {/* STAGE 1: UPLOAD */}
              {stage === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="max-w-3xl mx-auto"
                >
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
                      isDragging
                        ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20 scale-[1.02]"
                        : "border-slate-200 dark:border-slate-800 hover:border-teal-500/30 hover:bg-slate-50/50",
                    )}
                  >
                    <input
                      type="file"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".csv,.json,.xlsx,.xls,.parquet"
                    />
                    <div className="flex flex-col items-center gap-6">
                      <div
                        className={cn(
                          "w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300 shadow-xl shadow-teal-900/5",
                          isDragging ? "bg-teal-500 text-white" : "bg-white dark:bg-slate-800 text-slate-400"
                        )}
                      >
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          Drop your dataset here
                        </h3>
                        <p className="text-slate-500">
                          CSV, Excel, or Parquet supported
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STAGE 2: SCANNING */}
              {stage === "scanning" && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center pt-20"
                >
                  <Loader2 className="w-16 h-16 text-teal-500 animate-spin mb-8" />
                  <h2 className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 mb-2">
                    SENTRY SCAN INITIATED
                  </h2>
                  <p className="text-slate-500 font-mono text-sm animate-pulse">
                    Verifying schema integrity...
                  </p>
                </motion.div>
              )}

              {/* STAGE 3: IDENTITY CARD */}
              {stage === "identity" && identity && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="mb-8">
                    <Button
                      variant="ghost"
                      onClick={() => { setStage("upload"); setFile(null); }}
                      className="mb-4 text-slate-500 hover:text-slate-900"
                    >
                      ← Cancel & Re-upload
                    </Button>
                    <DatasetIdentityCard identity={identity} />
                  </div>

                  <div className="flex flex-col gap-4">
                    {identity.quality_score < 0.5 ? (
                      <SafeModeWarning
                        qualityScore={identity.quality_score}
                        onAccept={() => setStage("contract")}
                        onCancel={() => { setStage("upload"); setFile(null); }}
                      />
                    ) : (
                      <div className="flex justify-end">
                        <Button
                          size="lg"
                          onClick={handleProceedToContract}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-8 font-mono"
                        >
                          PROCEED TO CONTRACT <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STAGE 4: OVERSEER CONTRACT */}
              {stage === "contract" && identity && (
                <motion.div
                  key="contract"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <OverseerInterview
                    identity={identity}
                    onSubmit={handleContractSubmit}
                    onBack={() => setStage("identity")}
                  />
                </motion.div>
              )}

              {/* STAGE 5: PROCESSING */}
              {stage === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center pt-20"
                >
                  <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                    <CheckCircle2 className="absolute inset-0 m-auto w-8 h-8 text-teal-500" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Contract Approved
                  </h2>
                  <p className="text-slate-500">
                    Meridian is initializing the analysis pipeline...
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
