import { useState, useRef, useEffect } from "react";
import { Search, ArrowUp, Loader2 } from "lucide-react";

interface Props {
  onSubmit: (question: string) => void;
  isThinking: boolean;
  prefill?: string;
}

export function InsightLensInput({ onSubmit, isThinking, prefill }: Props) {
  const [value, setValue] = useState(prefill ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (prefill) setValue(prefill);
  }, [prefill]);

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || isThinking) return;
    onSubmit(q);
    setValue("");
  };

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
      <Search className="w-5 h-5 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="What do you want to know about this dataset?"
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground
          outline-none"
        disabled={isThinking}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim() || isThinking}
        className="shrink-0 p-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40
          hover:bg-blue-500 transition-colors"
      >
        {isThinking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
