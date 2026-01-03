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
import { BackgroundMesh } from "@/components/ui/BackgroundMesh";
import { AceLogo } from "@/components/ui/AceLogo";
import { ConfettiExplosion } from "@/components/ui/ConfettiExplosion";

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
  const [showConfetti, setShowConfetti] = useState(false);

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



      // ... inside handleContractSubmit success block ...
      toast.success("Mission Started", {
        description: "The Overseer has authorized this analysis run.",
      });
      setShowConfetti(true);
      setTimeout(() => navigate(`/pipeline/${result.run_id}`), 1500); // Delay navigation to show confetti
    } catch (error) {
      toast.error("Mission Aborted", {
        description: "Failed to submit analysis contract.",
      });
      setStage("contract");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors selection:bg-teal-500/30">
      {showConfetti && <ConfettiExplosion />}
      <BackgroundMesh />
      <Navbar />

      <main className="relative pt-24 pb-16 min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Container */}
        <div className="container px-4 max-w-5xl relative z-10">
          <AnimatePresence mode="wait">

            {/* Hero - Only show in upload stage */}
            {stage === "upload" && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center mb-16 flex flex-col items-center"
              >
                <div className="mb-8 scale-150 transform transition-transform duration-700 hover:scale-[1.6]">
                  <AceLogo size="xl" mode="icon" />
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-slate-900 dark:text-slate-50 font-serif">
                  ACE
                  <span className="block text-2xl sm:text-3xl font-sans font-light tracking-widest text-slate-500 mt-2 uppercase">
                    Autonomous Cognitive Engine
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  Upload your data. The <span className="text-teal-600 dark:text-teal-400 font-medium">Sentry</span> verifies integrity, and the <span className="text-teal-600 dark:text-teal-400 font-medium">Overseer</span> orchestrates the analysis.
                </p>
              </motion.div>
            )}

            {/* Main Content Area */}
            <div className="relative min-h-[400px]">
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
                      "group relative rounded-3xl p-16 text-center transition-all duration-500",
                      "border border-slate-200 dark:border-slate-800",
                      "bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50",
                      isDragging
                        ? "border-teal-500/50 bg-teal-50/50 dark:bg-teal-900/10 scale-[1.02] ring-2 ring-teal-500/20"
                        : "hover:border-teal-500/30 hover:shadow-teal-500/5"
                    )}
                  >
                    {/* Animated Border Gradient Helper */}
                    <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
                      style={{ background: 'radial-gradient(circle at center, rgba(20,184,166,0.05) 0%, transparent 70%)' }}
                    />

                    <input
                      type="file"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.parquet"
                    />
                    <div className="flex flex-col items-center gap-8 relative z-0">
                      <div
                        className={cn(
                          "w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500",
                          "bg-white dark:bg-slate-950 shadow-xl ring-1 ring-slate-900/5 dark:ring-slate-100/10",
                          isDragging ? "text-teal-500 scale-110 rotate-3" : "text-slate-400 group-hover:text-teal-500 group-hover:scale-105"
                        )}
                      >
                        <Upload className="w-10 h-10" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-serif font-medium text-slate-900 dark:text-slate-100">
                          {isDragging ? "Drop to Initialize" : "Drop your dataset here"}
                        </h3>
                        <p className="text-slate-500 font-sans tracking-wide text-sm uppercase">
                          CSV • Excel • Parquet
                        </p>
                      </div>

                      <Button variant="outline" className="mt-4 pointer-events-none opacity-50 font-mono text-xs tracking-wider">
                        CLICK TO BROWSE
                      </Button>
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
                    onProceed={() => handleContractSubmit("Run a comprehensive analysis of this dataset, identifying key drivers, anomalies, and segments.")}
                    onCustomize={() => setStage("contract")}
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
                    ACE is initializing the analysis pipeline...
                  </p>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Index;
