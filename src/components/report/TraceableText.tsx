import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn, escapeRegExp } from "@/lib/utils";

interface TraceableTextProps {
    content: string;
    segments?: { text: string; evidenceId: string }[];
    onReferenceClick?: (id: string) => void;
    className?: string;
}

/**
 * Renders narrative text with interactive evidence references.
 * Detects patterns like `[ref:123]` and converts them into clickable indicators.
 * Uses a serif font for reading comfort (handled by .prose-narrative class).
 */
export function TraceableText({ content, segments, onReferenceClick, className }: TraceableTextProps) {

    // Inject links for segments
    // We escape special regex characters in segment text to be safe
    let processedContent = content;
    if (segments) {
        segments.forEach(seg => {
            if (seg.text && seg.evidenceId) {
                // strict replacement to avoid replacing inside existing links if possible, 
                // but for now simple global replace of the phrase
                // Use a regex boundary or just the phrase
                const regex = new RegExp(`(${escapeRegExp(seg.text)})`, 'gi');
                // Replace with markdown link format: [text](ref:id)
                // We assume content doesn't already have this link
                processedContent = processedContent.replace(regex, `[$1](ref:${seg.evidenceId})`);
            }
        });
    }

    return (
        <article className={cn("prose-narrative prose prose-slate dark:prose-invert max-w-none", className)}>
            <ReactMarkdown
                components={{
                    a: ({ node, href, children, ...props }) => {
                        const isReference = href?.startsWith("ref:");
                        const refId = href?.replace("ref:", "");

                        if (isReference && refId) {
                            return (
                                <button
                                    onClick={() => onReferenceClick?.(refId)}
                                    className="cursor-pointer font-medium text-amber-700 dark:text-amber-400 border-b-2 border-dashed border-amber-500/50 hover:border-amber-500 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-all duration-200 mx-0.5 px-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1"
                                    title="View Evidence"
                                >
                                    {children}
                                </button>
                            );
                        }

                        return <a href={href} {...props}>{children}</a>;
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </article>
    );
}
