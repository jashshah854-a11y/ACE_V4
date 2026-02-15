import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropZone } from "@/components/upload/DropZone";
import { previewDataset, submitRun } from "@/lib/api";
import type { TaskIntent, DatasetPreview } from "@/lib/types";
import { toast } from "sonner";

const DEFAULT_INTENT: TaskIntent = {
  primary_question:
    "Identify key patterns, anomalies, and actionable insights to optimize business strategy",
  decision_context:
    "Strategic planning and operational improvement based on data-driven evidence",
  success_criteria:
    "Clear metrics, prioritized recommendations, and confidence-scored insights",
  required_output_type: "descriptive",
};

function generateSuggestedQuestions(preview: DatasetPreview): string[] {
  const questions: string[] = [];
  const numericCols = preview.schema_map
    .filter((c) => c.type === "Numeric")
    .map((c) => c.name);
  const categoricalCols = preview.schema_map
    .filter((c) => c.type === "String" || c.type === "Categorical")
    .map((c) => c.name);

  if (numericCols.length >= 2) {
    questions.push(
      `What is the relationship between ${numericCols[0]} and ${numericCols[1]}?`,
    );
  }

  if (numericCols.length > 0 && categoricalCols.length > 0) {
    questions.push(
      `How does ${numericCols[0]} vary across different ${categoricalCols[0]} categories?`,
    );
  }

  if (preview.detected_capabilities.has_financial_columns) {
    questions.push("What financial patterns or anomalies exist in this data?");
  }

  if (preview.detected_capabilities.has_time_series) {
    questions.push("What trends or seasonal patterns can be identified over time?");
  }

  if (numericCols.length > 0) {
    questions.push(`What factors most influence ${numericCols[0]}?`);
  }

  if (categoricalCols.length > 0) {
    questions.push(
      `Are there distinct segments or clusters within the ${categoricalCols[0]} groups?`,
    );
  }

  questions.push("What anomalies or outliers should be investigated?");

  return questions.slice(0, 4);
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");

  const handleFileSelect = async (selected: File) => {
    setFile(selected);
    setPreview(null);
    setQuestion("");
    setIsPreviewing(true);
    try {
      const result = await previewDataset(selected);
      setPreview(result);
    } catch (err) {
      console.error("[ACE] Preview failed:", err);
      toast.error(err instanceof Error ? err.message : "Could not analyze dataset structure");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsSubmitting(true);
    try {
      const intent: TaskIntent = {
        ...DEFAULT_INTENT,
        ...(question.trim() && { primary_question: question.trim() }),
      };
      const result = await submitRun(file, intent);
      toast.success(`Run ${result.run_id} queued`);
      navigate(`/pipeline/${result.run_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
      setIsSubmitting(false);
    }
  };

  const handleFileClear = () => {
    setFile(null);
    setPreview(null);
    setQuestion("");
  };

  const suggestedQuestions = preview ? generateSuggestedQuestions(preview) : [];
  const isBusy = isPreviewing || isSubmitting;

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
          our 20-agent AI pipeline.
        </p>

        <DropZone
          file={file}
          onFileSelect={handleFileSelect}
          onFileClear={handleFileClear}
          disabled={isBusy}
        />

        {isPreviewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing dataset structure...</span>
          </motion.div>
        )}

        {file && preview && !isPreviewing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 max-w-xl mx-auto"
          >
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-2">
              <span>
                <span className="text-foreground font-medium">
                  {preview.row_count.toLocaleString()}
                </span>{" "}
                rows
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>
                <span className="text-foreground font-medium">
                  {preview.column_count}
                </span>{" "}
                columns
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-green-400 font-medium">
                {Math.round(preview.quality_score * 100)}% quality
              </span>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground text-left mb-1.5">
                What question should ACE answer?
              </label>
              <Input
                placeholder="e.g. What drives customer churn in this dataset?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {suggestedQuestions.length > 0 && (
              <div className="text-left">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-muted-foreground">
                    Suggested questions
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuestion(q)}
                      disabled={isSubmitting}
                      className="text-xs px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 transition-colors text-left disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
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
              title: "20 AI Agents",
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
