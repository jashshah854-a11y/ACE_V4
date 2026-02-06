import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropZone } from "@/components/upload/DropZone";
import { submitRun } from "@/lib/api";
import type { TaskIntent } from "@/lib/types";
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

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");

  const handleFileSelect = (selected: File) => {
    setFile(selected);
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
  };

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
          disabled={isSubmitting}
        />

        {file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4 max-w-xl mx-auto"
          >
            <div>
              <label className="block text-sm text-muted-foreground text-left mb-1.5">
                What question should ACE answer? (optional)
              </label>
              <Input
                placeholder="e.g. What drives customer churn in this dataset?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8"
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
