import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/upload/DropZone";
import { uploadDataset, startAnalysis } from "@/lib/api";
import type { UploadResponse } from "@/lib/types";
import { toast } from "sonner";

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleFileSelect = async (selected: File) => {
    setFile(selected);
    setUploadResult(null);
    setIsUploading(true);
    try {
      const result = await uploadDataset(selected);
      setUploadResult(result);
      toast.success(
        `Uploaded ${result.filename}: ${result.row_count.toLocaleString()} rows, ${result.column_count} columns`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!uploadResult) return;
    setIsStarting(true);
    try {
      await startAnalysis(uploadResult.run_id);
      navigate(`/pipeline/${uploadResult.run_id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start analysis",
      );
      setIsStarting(false);
    }
  };

  const handleFileClear = () => {
    setFile(null);
    setUploadResult(null);
  };

  const isBusy = isUploading || isStarting;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center"
      >
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          <span className="text-blue-500">ACE</span> Intelligence Engine
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto">
          Transform raw data into executive-quality intelligence reports using
          our 19-agent AI pipeline.
        </p>

        <DropZone
          file={file}
          onFileSelect={handleFileSelect}
          onFileClear={handleFileClear}
          disabled={isBusy}
        />

        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading and profiling dataset...</span>
          </motion.div>
        )}

        {uploadResult && !isUploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span>
                <span className="text-foreground font-medium">
                  {uploadResult.row_count.toLocaleString()}
                </span>{" "}
                rows
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>
                <span className="text-foreground font-medium">
                  {uploadResult.column_count}
                </span>{" "}
                columns
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>
                Run{" "}
                <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">
                  {uploadResult.run_id.substring(0, 8)}
                </code>
              </span>
            </div>

            <Button
              size="lg"
              onClick={handleStartAnalysis}
              disabled={isStarting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Analysis...
                </>
              ) : (
                <>
                  Start Analysis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Zap,
              title: "19 AI Agents",
              desc: "Statistical analysis and LLM interpretation working in concert",
            },
            {
              icon: Shield,
              title: "Trust Scoring",
              desc: "Every insight comes with a confidence assessment",
            },
            {
              icon: BarChart3,
              title: "Executive Reports",
              desc: "Insights, hypotheses, and actionable recommendations",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 text-left"
            >
              <feature.icon className="w-5 h-5 text-blue-500 mb-3" />
              <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
