import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface NarrativeStreamProps {
    content: string;
    onClaimClick?: (type: 'business_pulse' | 'predictive_drivers' | null) => void;
}

export function NarrativeStream({ content, onClaimClick }: NarrativeStreamProps) {
    // Custom renderer to intercept sensitive text (like percentages) and make them interactive
    const components = {
        code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={`${className} bg-slate-200 dark:bg-slate-800 rounded px-1 py-0.5 font-mono text-sm`} {...props}>
                    {children}
                </code>
            );
        },
        // Intercept strong emphasis to act as "Claim Buttons" if they look like metrics
        strong({ children, ...props }: any) {
            // Simple heuristic: if it contains a % or $, treat it as a claim
            const text = String(children);
            const isMetric = /[%$]/.test(text) || /\d+/.test(text);

            if (isMetric && onClaimClick) {
                return (
                    <button
                        onClick={() => onClaimClick('business_pulse')}
                        className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer transition-colors"
                        title="View Evidence"
                    >
                        {children}
                    </button>
                );
            }
            return <strong {...props}>{children}</strong>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-8">
            <article className="prose prose-slate dark:prose-invert prose-lg font-serif">
                {/* Header Section */}
                <div className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
                    <p className="font-mono text-xs text-slate-500 mb-4 uppercase tracking-widest">
                        Intelligence Report // ACE V4
                    </p>
                </div>

                {/* Markdown Content */}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={components}
                >
                    {content}
                </ReactMarkdown>
            </article>
        </div>
    );
}
