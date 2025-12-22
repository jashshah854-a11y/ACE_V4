import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface ExecutiveNarrativeProps {
  headline: string;
  summary: string;
  keyPoints: string[];
  className?: string;
}

export function ExecutiveNarrative({
  headline,
  summary,
  keyPoints,
  className
}: ExecutiveNarrativeProps) {
  if (!headline && !summary) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn("py-8", className)}
    >
      {/* Headline */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-serif text-3xl md:text-4xl font-bold text-navy-900 leading-tight mb-6 max-w-3xl"
      >
        {headline}
      </motion.h2>

      {/* Summary - Two columns on larger screens */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-slate dark:prose-invert max-w-none mb-8"
        >
          <p className="text-lg text-muted-foreground leading-relaxed md:columns-2 md:gap-8">
            {summary}
          </p>
        </motion.div>
      )}

      {/* Key Points */}
      {keyPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {keyPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-3 p-4 bg-muted/30 rounded-sm border border-border"
            >
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{point}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.section>
  );
}
