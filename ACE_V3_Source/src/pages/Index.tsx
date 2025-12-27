import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileText, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      const result = await submitRun(file);
      toast.success("Analysis started", {
        description: `Run ID: ${result.run_id}`,
      });
      navigate(`/reports?run=${result.run_id}`);
    } catch (error) {
      toast.error("Failed to start analysis", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-dark-mesh pointer-events-none" />
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
                  disabled={isUploading}
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
