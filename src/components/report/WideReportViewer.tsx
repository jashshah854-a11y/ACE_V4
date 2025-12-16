import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MetricsCards } from "./MetricsCards";
import { PDFExporter, downloadMarkdown, copyToClipboard } from "./PDFExporter";
import { WideReportLayout } from "./WideReportLayout";
import { IntelligenceRail } from "./IntelligenceRail";
import { ReportCharts } from "./ReportCharts";
import { ReportAccordion, SECTION_ICONS } from "./ReportAccordion";
import { TableOfContents } from "./TableOfContents";
import { Button } from "@/components/ui/button";
import { Copy, FileDown } from "lucide-react";
import {
    extractMetrics,
    extractProgressMetrics,
    extractSections,
    extractChartData
} from "@/lib/reportParser";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface WideReportViewerProps {
    content?: string;
    className?: string;
    isLoading?: boolean;
    runId?: string;
}

export function WideReportViewer({
    content,
    className,
    isLoading,
    runId
}: WideReportViewerProps) {
    const [copied, setCopied] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const [currentSection, setCurrentSection] = useState("");
    const { toast } = useToast();

    // Track reading progress
    useEffect(() => {
        const handleScroll = () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
            setReadingProgress(Math.min(100, Math.max(0, progress)));
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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

    // Extract data for all components
    const metrics = extractMetrics(content);
    const progressMetrics = extractProgressMetrics(content);
    const sections = extractSections(content);
    const { segmentData, compositionData } = extractChartData(content);

    // Extract key insights for intelligence rail
    const keyTakeaways = content
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 20 && line.length < 150)
        .slice(0, 5);

    const handleCopy = async () => {
        const success = await copyToClipboard(content);
        if (success) {
            setCopied(true);
            toast({ title: "Copied to clipboard!" });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadMarkdown = () => {
        const filename = runId ? `ace-report-${runId}.md` : "ace-report.md";
        downloadMarkdown(content, filename);
        toast({ title: "Markdown downloaded!" });
    };

    const handleSectionClick = (sectionId: string) => {
        setCurrentSection(sectionId);
    };

    // Build accordion sections from content
    const accordionSections = [
        {
            id: "summary",
            title: "Executive Summary",
            icon: SECTION_ICONS.summary,
            defaultOpen: true,
            content: (
                <div className="space-y-4">
                    {/* Executive Summary Band */}
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {keyTakeaways.slice(0, 3).map((takeaway, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                                    <p className="text-sm">{takeaway}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "visualizations",
            title: "Data Visualizations",
            icon: SECTION_ICONS.quality,
            defaultOpen: true,
            content: (
                <ReportCharts
                    qualityScore={metrics.dataQualityScore}
                    segmentData={segmentData}
                    compositionData={compositionData}
                />
            ),
        },
        {
            id: "full-report",
            title: "Detailed Analysis",
            icon: SECTION_ICONS.insights,
            defaultOpen: false,
            content: (
                <article className="prose prose-slate dark:prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight]}
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
                </article>
            ),
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("w-full", className)}
        >
            {/* Wide Layout Container */}
            <WideReportLayout
                hero={
                    <>
                        {/* Export Toolbar */}
                        <div className="flex gap-2 justify-end flex-wrap mb-6">
                            <Button
                                onClick={handleCopy}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Copy className="h-4 w-4" />
                                {copied ? "Copied!" : "Copy"}
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

                        {/* Full-Width Hero Metrics */}
                        {Object.keys(metrics).length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <MetricsCards metrics={metrics} />
                            </motion.div>
                        )}
                    </>
                }
                mainContent={
                    <div id="report-content">
                        <ReportAccordion sections={accordionSections} />
                    </div>
                }
                intelligenceRail={
                    <div className="space-y-4">
                        <TableOfContents
                            sections={sections}
                        />
                        <IntelligenceRail
                            keyTakeaways={keyTakeaways}
                            criticalIssues={{
                                count: metrics.anomalyCount || 0,
                                items: metrics.anomalyCount ? [`${metrics.anomalyCount} anomalies detected`] : []
                            }}
                            quickStats={{
                                dataQuality: metrics.dataQualityScore,
                                confidence: metrics.confidenceLevel,
                                anomalies: metrics.anomalyCount
                            }}
                            sections={sections.map(s => ({ id: s.id, title: s.title }))}
                            currentSection={currentSection}
                            readingProgress={readingProgress}
                            onSectionClick={handleSectionClick}
                        />
                    </div>
                }
            />
        </motion.div>
    );
}
