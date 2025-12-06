
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface ReportViewerProps {
  content?: string;
  className?: string;
  isLoading?: boolean;
}

export function ReportViewer({ content, className, isLoading }: ReportViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-1/3"></div>
        <div className="h-4 bg-slate-100 rounded w-full"></div>
        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
        <div className="h-4 bg-slate-100 rounded w-4/6"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        No report content available.
      </div>
    );
  }

  return (
    <article className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Custom overrides can go here if needed
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg border">
              <table className="w-full" {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
