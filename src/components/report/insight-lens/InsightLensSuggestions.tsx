import { motion } from "framer-motion";

interface Suggestion {
  label: string;
  question: string;
}

interface Props {
  suggestions: Suggestion[];
  onSelect: (question: string) => void;
}

export function InsightLensSuggestions({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide">
      {suggestions.map((s, i) => (
        <motion.button
          key={s.label}
          type="button"
          onClick={() => onSelect(s.question)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
            bg-secondary text-secondary-foreground hover:bg-teal-500/20 hover:text-teal-400
            border border-border hover:border-teal-500/40
            transition-colors whitespace-nowrap"
        >
          {s.label}
        </motion.button>
      ))}
    </div>
  );
}
