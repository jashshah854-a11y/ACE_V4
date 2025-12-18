import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MetricsCards } from "./MetricsCards";
import { ProgressIndicators } from "./ProgressIndicators";
import { PDFExporter, downloadMarkdown, copyToClipboard } from "./PDFExporter";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileDown } from "lucide-react";
import { extractMetrics, extractProgressMetrics, extractSections } from "@/lib/reportParser";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EnhancedReportViewerProps {
    content?: string;
    className?: string;
    isLoading?: boolean;
    runId?: string;
}

export function EnhancedReportViewer({
    content,
    className,
    isLoading,
    runId
}: EnhancedReportViewerProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

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

    // Extract data for enhancements
    const metrics = extractMetrics(content);
    const progressMetrics = extractProgressMetrics(content);
    const sections = extractSections(content);

    const handleCopy = async () => {
        const success = await copyToClipboard(content);
        if (success) {
            setCopied(true);
            toast({ title: "Copied to clipboard!" });
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast({ title: "Failed to copy", variant: "destructive" });
        }
    };

    const handleDownloadMarkdown = () => {
        const filename = runId ? `ace-report-${runId}.md` : "ace-report.md";
        downloadMarkdown(content, filename);
        toast({ title: "Markdown downloaded!" });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("space-y-6", className)}
        >
            {/* Action Toolbar */}
            <div className="flex gap-2 justify-end flex-wrap">
                <Button
                    onClick={handleCopy}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy Text"}
                </Button>

                <Button
                    onClick={handleDownloadMarkdown}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                >
                    <FileDown className="h-4 w-4" />
                    Download MD
                </Button>

                <PDFExporter
                    contentId="report-content"
                    filename={runId ? `ace-report-${runId}.pdf` : "ace-report.pdf"}
                />
            </div>

            {/* Executive Dashboard Cards */}
            {Object.keys(metrics).length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <MetricsCards metrics={metrics} className="mb-6" />
                </motion.div>
            )}

            {/* Progress Indicators */}
            {(progressMetrics.completeness || progressMetrics.confidence || progressMetrics.validRecords) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-muted/30 p-6 rounded-lg"
                >
                    <h3 className="text-lg font-semibold mb-4">Quality Metrics</h3>
                    <ProgressIndicators {...progressMetrics} />
                </motion.div>
            )}

            {/* Main Report Content */}
            <motion.article
                id="report-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className={cn("prose prose-slate dark:prose-invert max-w-none", className)}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                        table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-6 rounded-lg border">
                                <table className="w-full" {...props} />
                            </div>
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </motion.article>
        </motion.div>
    );
}
