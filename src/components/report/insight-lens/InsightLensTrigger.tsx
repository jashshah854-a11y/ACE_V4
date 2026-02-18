import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  onClick: () => void;
}

export function InsightLensTrigger({ onClick }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full
        bg-gradient-to-r from-teal-600 to-violet-600 text-white text-sm font-medium
        shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40
        transition-shadow duration-300 group"
      style={{
        animation: "insight-pulse 3s ease-in-out infinite",
      }}
    >
      <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
      <span className="hidden sm:inline">Ask about this analysis</span>
      <span className="sm:hidden">Ask AI</span>
      <kbd className="hidden md:inline-flex ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20">
        ⌘K
      </kbd>

      <style>{`
        @keyframes insight-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
      `}</style>
    </motion.button>
  );
}
