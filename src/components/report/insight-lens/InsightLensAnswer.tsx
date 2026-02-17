import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { InsightLensMessage } from "@/lib/types";
import { EvidenceRefBadge } from "./EvidenceRef";
import { User, Sparkles } from "lucide-react";

interface Props {
  message: InsightLensMessage;
  isThinking?: boolean;
  isStreaming?: boolean;
  onNavigateEvidence: (section: string, key: string) => void;
}

function ThinkingShimmer() {
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-secondary animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-secondary animate-pulse" />
      </div>
    </div>
  );
}

export function InsightLensAnswer({ message, isThinking, isStreaming, onNavigateEvidence }: Props) {
  if (isThinking) return <ThinkingShimmer />;

  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-5 py-3"
    >
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-secondary text-secondary-foreground"
            : "bg-gradient-to-br from-blue-600 to-violet-600 text-white"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        {isUser ? (
          <p className="text-sm text-foreground">{message.content}</p>
        ) : (
          <>
            {isStreaming ? (
              // Streaming: show raw text as it arrives (JSON fragments, not markdown yet)
              <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                {message.content}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-blue-400 animate-pulse" />
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none text-sm [&>p]:my-1.5 [&>ul]:my-1.5 [&>ol]:my-1.5">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            {!isStreaming && message.evidence && message.evidence.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {message.evidence.map((ev, i) => (
                  <EvidenceRefBadge
                    key={`${ev.section}-${ev.key}-${i}`}
                    evidence={ev}
                    onNavigate={onNavigateEvidence}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
