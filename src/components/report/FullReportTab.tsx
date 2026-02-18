import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  markdown: string;
}

export function FullReportTab({ markdown }: Props) {
  if (!markdown) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No full report available for this analysis.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-foreground prose-a:text-teal-400 prose-code:text-teal-300 prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-th:text-foreground prose-td:text-foreground/80 prose-hr:border-border">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
