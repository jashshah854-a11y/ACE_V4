
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { submitRun, previewDataset, DatasetIdentity } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DatasetUnderstanding } from "@/components/upload/DatasetUnderstanding";
import { TaskContractInput } from "@/components/upload/TaskContractInput";
import { DatasetProfile } from "@/hooks/useDatasetProfile";

type AnalysisStage = "upload" | "scanning" | "identity" | "contract" | "processing";

/**
 * Adapter to convert API Identity to UI Profile
 */
function adaptIdentityToProfile(identity: DatasetIdentity): DatasetProfile {
  // Simple heuristic to guess primary type if not provided
  const columnNames = identity.schema_map.map(c => c.name.toLowerCase());
  let primaryType = "general_analysis";

  if (columnNames.some(c => c.includes("spend") || c.includes("cost") || c.includes("campaign"))) {
    primaryType = "marketing_performance";
  } else if (columnNames.some(c => c.includes("churn") || c.includes("retention"))) {
    primaryType = "customer_churn";
  } else if (columnNames.some(c => c.includes("revenue") || c.includes("sales"))) {
    primaryType = "sales_pipeline";
  }

  return {
    profile_id: "temp_id_" + Date.now(),
    primary_type: primaryType,
    friendly_name: primaryType.replace("_", " "),
    rows: identity.row_count,
    columns: identity.column_count,
    quality_score: identity.quality_score,
    key_columns: identity.schema_map.slice(0, 5).map(c => c.name),
    detected_focus: "automated insights",
    time_coverage: identity.detected_capabilities.has_time_series ? "valid" : "issue",
    validation_mode: identity.quality_score > 0.6 ? "full" : "limitations",
    schema_preview: identity.schema_map.map(s => ({ name: s.name, type: s.type }))
  };
}

const Index = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<AnalysisStage>("upload");
  const [identity, setIdentity] = useState<DatasetIdentity | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);

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
      setProfile(adaptIdentityToProfile(result));
      setStage("identity");
    } catch (error) {
      console.error(error);
      toast.error("Scan Failed", {
        description: "Could not analyze dataset structure. Please try again."
      });
      setStage("upload");
      setFile(null);
    }
  };

  const handleContractSubmit = async (userIntent: string) => {
    if (!file) return;

    setStage("processing");
    try {
      const taskIntent = {
        primaryQuestion: userIntent,
        decisionContext: userIntent, // Mapping full intent to context as well
        requiredOutputType: "diagnostic" as const,
        successCriteria: "Derived from user intent",
        constraints: "", // Clean slate
        confidenceThreshold: 80,
        confidenceAcknowledged: true,
      };

      const result = await submitRun(file, taskIntent);

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

              {/* STAGE 3: IDENTITY HANDSHAKE (PREMIUM UI) */}
              {stage === "identity" && profile && (
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => { setStage("upload"); setFile(null); }}
                    className="mb-6 text-slate-500 hover:text-slate-900"
                  >
                    ← Cancel & Re-upload
                  </Button>

                  <DatasetUnderstanding
                    profile={profile}
                    onProceed={() => setStage("contract")}
                  />
                </motion.div>
              )}

              {/* STAGE 4: OVERSEER CONTRACT (PREMIUM UI) */}
              {stage === "contract" && profile && (
                <motion.div
                  key="contract"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <TaskContractInput
                    profile={profile}
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
