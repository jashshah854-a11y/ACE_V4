import { useState, useEffect, useCallback, useRef } from "react";
import type { Snapshot } from "@/lib/types";
import { useInsightLens } from "@/hooks/useInsightLens";
import { useSuggestions } from "./useSuggestions";
import { InsightLensTrigger } from "./InsightLensTrigger";
import { InsightLensOverlay } from "./InsightLensOverlay";
import { InsightLensInput } from "./InsightLensInput";
import { InsightLensSuggestions } from "./InsightLensSuggestions";
import { InsightLensAnswer } from "./InsightLensAnswer";

interface Props {
  runId: string;
  activeTab: string;
  snapshot: Snapshot;
}

const SECTION_TAB_MAP: Record<string, string> = {
  smart_narrative: "summary",
  executive_summary: "summary",
  deep_insights: "insights",
  governed_report: "insights",
  hypotheses: "hypotheses",
  trust: "trust",
  report_markdown: "report",
};

export function InsightLens({ runId, activeTab, snapshot }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<string>();
  const triggerRef = useRef<DOMRect | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const { messages, isThinking, streamingContent, ask, clear } = useInsightLens(runId, activeTab);
  const suggestions = useSuggestions(activeTab, snapshot);

  const open = useCallback((rect?: DOMRect) => {
    triggerRef.current = rect ?? null;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPrefill(undefined);
  }, []);

  // Ctrl+K / Cmd+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-scroll thread
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isThinking, streamingContent]);

  const handleSubmit = (question: string) => {
    setPrefill(undefined);
    ask(question);
  };

  const handleSuggestionSelect = (question: string) => {
    setPrefill(undefined);
    ask(question);
  };

  const handleNavigateEvidence = (section: string, _key: string) => {
    close();
    const targetTab = SECTION_TAB_MAP[section];
    if (targetTab) {
      // Dispatch custom event for ReportPage to pick up
      window.dispatchEvent(
        new CustomEvent("insight-lens:navigate", {
          detail: { tab: targetTab, section, key: _key },
        }),
      );
    }
  };

  return (
    <>
      <InsightLensTrigger
        onClick={() => {
          const btn = document.querySelector("[data-insight-trigger]");
          open(btn?.getBoundingClientRect());
        }}
      />

      <InsightLensOverlay
        isOpen={isOpen}
        onClose={close}
        triggerRect={triggerRef.current}
      >
        <InsightLensInput
          onSubmit={handleSubmit}
          isThinking={isThinking}
          prefill={prefill}
        />

        {messages.length === 0 && (
          <InsightLensSuggestions
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
          />
        )}

        <div ref={threadRef} className="flex-1 overflow-y-auto min-h-0">
          {messages.map((msg) => (
            <InsightLensAnswer
              key={msg.id}
              message={msg}
              onNavigateEvidence={handleNavigateEvidence}
            />
          ))}
          {streamingContent && (
            <InsightLensAnswer
              message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: 0 }}
              isStreaming
              onNavigateEvidence={handleNavigateEvidence}
            />
          )}
          {isThinking && !streamingContent && (
            <InsightLensAnswer
              message={{ id: "thinking", role: "assistant", content: "", timestamp: 0 }}
              isThinking
              onNavigateEvidence={handleNavigateEvidence}
            />
          )}
        </div>

        {messages.length > 0 && (
          <div className="px-5 py-2 border-t border-border">
            <button
              type="button"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear conversation
            </button>
          </div>
        )}
      </InsightLensOverlay>
    </>
  );
}
