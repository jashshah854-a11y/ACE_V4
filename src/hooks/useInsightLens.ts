import { useState, useCallback, useRef } from "react";
import { askInsightLensStream } from "@/lib/api";
import type { InsightLensMessage, EvidenceRef } from "@/lib/types";

export function useInsightLens(runId: string, activeTab: string) {
  const [messages, setMessages] = useState<InsightLensMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(
    async (question: string) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: InsightLensMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      try {
        await askInsightLensStream(
          runId,
          question,
          { activeTab },
          // onComplete — SSE sends one complete event with parsed answer + evidence
          (answer: string, evidence: EvidenceRef[]) => {
            const assistantMsg: InsightLensMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: answer,
              evidence,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setIsThinking(false);
          },
          // onError
          (errorMsg: string) => {
            const errMessage: InsightLensMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: errorMsg,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errMessage]);
            setIsThinking(false);
          },
        );
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        const errorMsg: InsightLensMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Unable to analyze right now. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsThinking(false);
      }
    },
    [runId, activeTab],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsThinking(false);
  }, []);

  return { messages, isThinking, ask, clear };
}
