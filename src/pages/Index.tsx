import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { submitRun } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Index = () => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [taskIntent, setTaskIntent] = useState({
    primaryQuestion: "",
    decisionContext: "",
    requiredOutputType: "diagnostic" as "diagnostic" | "descriptive" | "predictive",
    successCriteria: "",
    constraints: "",
    confidenceThreshold: 80,
    confidenceAcknowledged: false,
  });

  // Validation is always true since we allow empty fields (backend will use defaults)
  const contractAssessment = { valid: true, message: null };

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
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Use defaults if fields are empty
      const finalTaskIntent = {
        primaryQuestion: taskIntent.primaryQuestion.trim() || "Analyze dataset for key insights, anomalies, and trends.",
        decisionContext: taskIntent.decisionContext.trim() || "General exploratory analysis to understand data distribution and quality.",
        requiredOutputType: taskIntent.requiredOutputType,
        successCriteria: taskIntent.successCriteria.trim() || "Clear report identifying main drivers, clusters, and outliers.",
        constraints: taskIntent.constraints.trim() || "None specific.",
        confidenceThreshold: taskIntent.confidenceThreshold,
        confidenceAcknowledged: true, // Auto-acknowledge for frictionless experience
      };

      const result = await submitRun(file, finalTaskIntent);
      toast.success("Analysis started", {
        description: "Your document is being analyzed.",
      });
      navigate(`/pipeline/${result.run_id}`);
    } catch (error) {
      toast.error("Analysis failed", {
        description: "There was an error starting the analysis.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="relative pt-24 pb-16 min-h-screen flex flex-col items-center justify-center">
        <div className="container px-4 max-w-4xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Data Analysis</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Discover insights with
              <span className="text-gradient block mt-2">Meridian Intelligence</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your data files and let our autonomous engine detect anomalies,
              validate quality, and generate comprehensive intelligence reports.
              Upload your data files and let our autonomous engine detect anomalies, validate quality, and generate
              comprehensive intelligence reports.
            </p>
          </motion.div>

          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card rounded-2xl p-8"
          >
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
                file && "border-success bg-success/5",
              )}
            >
              <input
                type="file"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".csv,.json,.xlsx,.xls,.parquet"
              />

              {file ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
                      isDragging ? "gradient-meridian glow-primary" : "bg-muted",
                    )}
                  >
                    <Upload
                      className={cn("w-8 h-8 transition-colors", isDragging ? "text-white" : "text-muted-foreground")}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Drop your data file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse · CSV, JSON, Excel, Parquet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Options Toggle */}
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Advanced Analysis Options
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {showAdvancedOptions ? "Hide" : "Show"}
                </span>
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Skip this to run a quick exploratory analysis with smart defaults
              </p>
            </div>

            {showAdvancedOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 space-y-4"
              >
                <div>
                  <div className="text-sm font-semibold mb-1">
                    Primary decision question <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </div>
                  <Textarea
                    value={taskIntent.primaryQuestion}
                    onChange={(e) => setTaskIntent((prev) => ({ ...prev, primaryQuestion: e.target.value }))}
                    placeholder="Example: Should we expand to the Asian market in Q4?"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">
                    Decision context <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </div>
                  <Textarea
                    value={taskIntent.decisionContext}
                    onChange={(e) => setTaskIntent((prev) => ({ ...prev, decisionContext: e.target.value }))}
                    placeholder="Describe the business situation, stakeholders, and why the decision matters."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-semibold mb-1">Required output type</div>
                    <select
                      value={taskIntent.requiredOutputType}
                      onChange={(e) => setTaskIntent((prev) => ({ ...prev, requiredOutputType: e.target.value as typeof prev.requiredOutputType }))}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="diagnostic">Diagnostic (root-cause)</option>
                      <option value="descriptive">Descriptive (data health)</option>
                      <option value="predictive">Predictive (forward-looking)</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Confidence floor (%)</div>
                    <Input
                      type="number"
                      min={60}
                      max={95}
                      value={taskIntent.confidenceThreshold}
                      onChange={(e) =>
                        setTaskIntent((prev) => ({ ...prev, confidenceThreshold: Number(e.target.value) || prev.confidenceThreshold }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">
                    Success criteria <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </div>
                  <Textarea
                    value={taskIntent.successCriteria}
                    onChange={(e) => setTaskIntent((prev) => ({ ...prev, successCriteria: e.target.value }))}
                    placeholder="Example: Win = 20% lift in CLV while keeping CAC below $200."
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">
                    Constraints & out-of-scope dimensions <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </div>
                  <Textarea
                    value={taskIntent.constraints}
                    onChange={(e) => setTaskIntent((prev) => ({ ...prev, constraints: e.target.value }))}
                    placeholder="Budgets, markets, timelines, banned metrics, or excluded cohorts."
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={taskIntent.confidenceAcknowledged}
                    onChange={(e) => setTaskIntent((prev) => ({ ...prev, confidenceAcknowledged: e.target.checked }))}
                  />
                  <span>I understand that insights with confidence below the selected threshold will be suppressed.</span>
                </label>
                {!contractAssessment.valid && (
                  <div className="text-xs text-red-600">{contractAssessment.message}</div>
                )}
              </motion.div>
            )}

            {/* Action Button */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex justify-center"
              >
                <Button
                  size="lg"
                  onClick={handleAnalyze}
                  disabled={isUploading || !contractAssessment.valid}
                  className="gradient-meridian text-white px-8 h-12 text-base font-medium glow-primary hover:opacity-90 transition-opacity"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Start Analysis
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Features */}
            <div className="mt-8 pt-8 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { icon: FileText, title: "Multi-format", desc: "CSV, JSON, Excel & more" },
                { icon: Sparkles, title: "AI Analysis", desc: "Anomaly & pattern detection" },
                { icon: CheckCircle2, title: "Quality Reports", desc: "Comprehensive insights" },
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
