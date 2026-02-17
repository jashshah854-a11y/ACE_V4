import { useMemo } from "react";
import type { Snapshot } from "@/lib/types";

interface Suggestion {
  label: string;
  question: string;
}

const TAB_SUGGESTIONS: Record<string, Suggestion[]> = {
  summary: [
    { label: "Top 3 actions", question: "What are the top 3 actionable insights from this analysis?" },
    { label: "Key risks", question: "What are the biggest risks or red flags in this dataset?" },
    { label: "Data story", question: "Summarize the data story in 2-3 sentences." },
  ],
  insights: [
    { label: "Surprising patterns", question: "What are the most surprising patterns found?" },
    { label: "Business impact", question: "Which insights have the highest business impact?" },
    { label: "Missing angles", question: "What angles might this analysis be missing?" },
  ],
  hypotheses: [
    { label: "Red flags", question: "Explain the red flag hypotheses and what they mean." },
    { label: "Most testable", question: "Which hypothesis is easiest to test with additional data?" },
    { label: "Boldest claim", question: "What is the boldest hypothesis and how confident should we be?" },
  ],
  trust: [
    { label: "Low confidence", question: "Why is the confidence score at its current level?" },
    { label: "Improve trust", question: "What would improve the trust score the most?" },
    { label: "Limitations", question: "What are the most important limitations of this analysis?" },
  ],
  report: [
    { label: "Quick summary", question: "Give me a 3-bullet executive summary of this report." },
    { label: "Methodology", question: "What methodology was used and is it appropriate?" },
    { label: "Next steps", question: "What should we do next based on this report?" },
  ],
};

export function useSuggestions(activeTab: string, snapshot: Snapshot | undefined): Suggestion[] {
  return useMemo(() => {
    const base = TAB_SUGGESTIONS[activeTab] ?? TAB_SUGGESTIONS.summary;
    const dynamic: Suggestion[] = [];

    if (!snapshot) return base;

    const confidence = snapshot.trust?.overall_confidence ?? 0;
    if (confidence < 40) {
      dynamic.push({
        label: "Why low trust?",
        question: `The confidence score is only ${Math.round(confidence)}%. Why is it so low?`,
      });
    }

    if (snapshot.hypotheses?.red_flag_count && snapshot.hypotheses.red_flag_count > 0) {
      dynamic.push({
        label: `${snapshot.hypotheses.red_flag_count} red flags`,
        question: `There are ${snapshot.hypotheses.red_flag_count} red flags. What should I worry about most?`,
      });
    }

    const warnings = snapshot.run_warnings ?? [];
    if (warnings.length > 0) {
      dynamic.push({
        label: "Warnings",
        question: "Explain the run warnings and their impact on results.",
      });
    }

    return [...dynamic, ...base].slice(0, 5);
  }, [activeTab, snapshot]);
}
