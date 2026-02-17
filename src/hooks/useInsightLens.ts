import { useState, useCallback, useRef } from "react";
import { askInsightLensStream } from "@/lib/api";
import type { InsightLensMessage, EvidenceRef } from "@/lib/types";

export function useInsightLens(runId: string, activeTab: string) {
  const [messages, setMessages] = useState<InsightLensMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const streamBuffer = useRef("");

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
      setStreamingContent("");
      streamBuffer.current = "";

      try {
        await askInsightLensStream(
          runId,
          question,
          { activeTab },
          // onToken — accumulate streaming text
          (token: string) => {
            streamBuffer.current += token;
            setStreamingContent(streamBuffer.current);
            // Once we have some content, switch from shimmer to streaming
            setIsThinking(false);
          },
          // onComplete — finalize with parsed answer + evidence
          (answer: string, evidence: EvidenceRef[]) => {
            const assistantMsg: InsightLensMessage = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: answer,
              evidence,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent("");
            streamBuffer.current = "";
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
            setStreamingContent("");
            streamBuffer.current = "";
            setIsThinking(false);
          },
        );
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
        setStreamingContent("");
        streamBuffer.current = "";
        setIsThinking(false);
      }
    },
    [runId, activeTab],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    streamBuffer.current = "";
  }, []);

  return { messages, isThinking, streamingContent, ask, clear };
}
