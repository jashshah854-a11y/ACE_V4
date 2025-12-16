import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HeroMetrics } from "./HeroMetrics";
import { CircularProgress, ProgressRingGroup } from "./CircularProgress";
import { InsightCard, TwoColumnInsight } from "./InsightCard";
import { StatusBadge, TrafficLight } from "./StatusBadge";
import { PDFExporter, downloadMarkdown, copyToClipboard } from "./PDFExporter";
import { ReportCharts } from "./ReportCharts";
import { ReportAccordion } from "./ReportAccordion";
import { TableOfContents } from "./TableOfContents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Copy,
    Download,
    FileDown,
    Database,
    Shield,
    CheckCircle2,
    TrendingUp,
    BarChart3,
    AlertTriangle
} from "lucide-react";
import { extractMetrics, extractProgressMetrics, extractSections, extractChartData } from "@/lib/reportParser";
import { useState } from "react";
import { toast } from "sonner";

interface PremiumReportViewerProps {
    content?: string;
    className?: string;
    isLoading?: boolean;
    runId?: string;
}

export function PremiumReportViewer({
    content,
    className,
    isLoading,
    runId
}: PremiumReportViewerProps) {
    const [copied, setCopied] = useState(false);

    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Skeleton for hero metrics */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Skeleton for content */}
                <div className="space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                <Database className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No report content available</p>
                <p className="text-sm mt-2">Enter a Run ID to view the analysis</p>
            </div>
        );
    }

    // Extract data
    const metrics = extractMetrics(content);
    const progressMetrics = extractProgressMetrics(content);
    const sections = extractSections(content);
    const { segmentData, compositionData } = extractChartData(content);

    const handleCopy = async () => {
        const success = await copyToClipboard(content);
        if (success) {
            setCopied(true);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast.error("Failed to copy");
        }
    };

    const handleDownloadMarkdown = () => {
        const filename = runId ? `ace-report-${runId}.md` : "ace-report.md";
        downloadMarkdown(content, filename);
        toast.success("Markdown downloaded!");
    };

    // Build hero metrics
    const heroMetrics = [
        {
            value: metrics.dataQualityScore || 0,
            label: "Data Quality Score",
            suffix: "%",
            trend: (metrics.dataQualityScore || 0) >= 90 ? "up" as const : "neutral" as const,
            color: (metrics.dataQualityScore || 0) >= 90 ? "green" as const : (metrics.dataQualityScore || 0) >= 70 ? "yellow" as const : "red" as const,
            icon: <CheckCircle2 className="h-6 w-6" />,
        },
        {
            value: metrics.recordsProcessed || 0,
            label: "Records Analyzed",
            trend: "up" as const,
            color: "blue" as const,
            icon: <Database className="h-6 w-6" />,
        },
        {
            value: metrics.anomalyCount || 0,
            label: "Anomalies Detected",
            trend: (metrics.anomalyCount || 0) > 0 ? "down" as const : "neutral" as const,
            color: (metrics.anomalyCount || 0) > 10 ? "red" as const : "yellow" as const,
            icon: <AlertTriangle className="h-6 w-6" />,
        },
        {
            value: metrics.confidenceLevel || 0,
            label: "Confidence Level",
            suffix: "%",
            trend: "up" as const,
            color: "green" as const,
            icon: <TrendingUp className="h-6 w-6" />,
        },
    ].filter(m => m.value > 0);

    // Build progress rings
    const progressRings = [
        { value: progressMetrics.completeness || 0, label: "Completeness" },
        { value: progressMetrics.confidence || 0, label: "Confidence" },
        { value: progressMetrics.validRecords || 0, label: "Valid Records" },
    ].filter(p => p.value > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-8">
            {/* Main Content */}
            <div className={cn("space-y-8", className)}>
                {/* Export Toolbar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 justify-end flex-wrap"
                >
                    <Button
                        onClick={handleCopy}
                        variant="outline"
                        size="sm"
                        className="gap-2 hover:bg-primary hover:text-primary-foreground"
                    >
                        <Copy className="h-4 w-4" />
                        {copied ? "Copied!" : "Copy"}
                    </Button>

                    <Button
                        onClick={handleDownloadMarkdown}
                        variant="outline"
                        size="sm"
                        className="gap-2 hover:bg-primary hover:text-primary-foreground"
                    >
                        <FileDown className="h-4 w-4" />
                        Markdown
                    </Button>

                    <PDFExporter
                        contentId="premium-report-content"
                        filename={runId ? `ace-report-${runId}.pdf` : "ace-report.pdf"}
                    />
                </motion.div>

                {/* Hero Metrics Section */}
                {heroMetrics.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Executive Summary
                        </h2>
                        <HeroMetrics metrics={heroMetrics} />
                    </motion.section>
                )}

                {/* Interactive Charts */}
                {(segmentData.length > 0 || compositionData.length > 0 || metrics.dataQualityScore) && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <InsightCard
                            title="Visual Analytics"
                            icon={BarChart3}
                            status="info"
                        >
                            <ReportCharts
                                segmentData={segmentData}
                                compositionData={compositionData}
                                qualityScore={metrics.dataQualityScore}
                            />
                        </InsightCard>
                    </motion.section>
                )}

                {/* Progress Rings */}
                {progressRings.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="border-2">
                            <CardContent className="pt-6">
                                <h3 className="text-lg font-semibold mb-6 text-center">Quality Metrics</h3>
                                <ProgressRingGroup items={progressRings} />
                            </CardContent>
                        </Card>
                    </motion.section>
                )}

                {/* Main Report Content */}
                <motion.div
                    id="premium-report-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    {sections.length > 0 ? (
                        <ReportAccordion sections={sections} />
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <article className={cn("prose prose-slate dark:prose-invert max-w-none", className)}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                        components={{
                                            table: ({ node, ...props }) => (
                                                <div className="overflow-x-auto my-6 rounded-lg border shadow-sm">
                                                    <table className="w-full" {...props} />
                                                </div>
                                            ),
                                        }}
                                    >
                                        {content}
                                    </ReactMarkdown>
                                </article>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </div>

            {/* Sidebar - Table of Contents */}
            {sections.length > 0 && (
                <motion.aside
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="hidden lg:block"
                >
                    <TableOfContents sections={sections} />

                    {/* Quick Stats Card */}
                    <Card className="mt-6 border-2">
                        <CardContent className="pt-6">
                            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                                Quick Stats
                            </h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Overall Status</span>
                                    <TrafficLight
                                        status={(metrics.dataQualityScore || 0) >= 90 ? "green" : (metrics.dataQualityScore || 0) >= 70 ? "yellow" : "red"}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm">Sections</span>
                                    <span className="font-bold">{sections.length}</span>
                                </div>
                                {metrics.anomalyCount !== undefined && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">Alerts</span>
                                        <StatusBadge
                                            severity={metrics.anomalyCount > 10 ? "high" : metrics.anomalyCount > 0 ? "medium" : "low"}
                                            label={metrics.anomalyCount.toString()}
                                            showIcon={false}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.aside>
            )}
        </div>
    );
}
