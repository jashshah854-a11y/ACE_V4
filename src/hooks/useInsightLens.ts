import { useState, useCallback } from "react";
import { askInsightLens } from "@/lib/api";
import type { InsightLensMessage } from "@/lib/types";

export function useInsightLens(runId: string, activeTab: string) {
  const [messages, setMessages] = useState<InsightLensMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const ask = useCallback(
    async (question: string) => {
      const userMsg: InsightLensMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        const res = await askInsightLens(runId, question, { activeTab });
        const assistantMsg: InsightLensMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          evidence: res.evidence,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        const errorMsg: InsightLensMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err instanceof Error
              ? `Unable to analyze right now: ${err.message}`
              : "Unable to analyze right now. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsThinking(false);
      }
    },
    [runId, activeTab],
  );

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isThinking, ask, clear };
}
