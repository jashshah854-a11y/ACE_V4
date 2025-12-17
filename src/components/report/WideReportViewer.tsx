import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { AnomalyBanner } from "./AnomalyBanner";
import { Button } from "@/components/ui/button";
import { Copy, FileDown } from "lucide-react";
import {
    extractMetrics,
    extractProgressMetrics,
    extractSections,
    extractChartData,
    extractClusterMetrics,
    extractPersonas,
    extractOutcomeModel,
    extractAnomalies
} from "@/lib/reportParser";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ClusterGaugeSection } from "./ClusterGaugeSection";
import { PersonaSection } from "./PersonaSection";
import { OutcomeModelSection } from "./OutcomeModelSection";
import { ReportSkeleton } from "./ReportSkeleton";
import { ExecutiveBrief } from "./ExecutiveBrief";
import { TechnicalDetailsSection } from "./TechnicalDetailsSection";
import { ReportConclusion } from "./ReportConclusion";
import { extractExecutiveBrief, extractConclusion } from "@/lib/narrativeExtractors";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { DistributionCharts } from "./DistributionCharts";
import { BusinessIntelligenceDashboard } from "./BusinessIntelligenceDashboard";
import { HeroInsightPanel } from "./HeroInsightPanel";
import { MondayMorningActions } from "./MondayMorningActions";
import { SegmentComparison } from "./SegmentComparison";
import { MetricGrid, interpretSilhouetteScore, interpretR2Score, interpretDataQuality } from "./MetricInterpretation";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";

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

    const { data: enhancedAnalytics, loading: analyticsLoading } = useEnhancedAnalytics(runId);

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
        return <ReportSkeleton />;
    }

    if (!content || content.trim().length === 0) {
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

    // NEW: Extract structured data for visual components
    const clusterMetrics = extractClusterMetrics(content);
    const personas = extractPersonas(content);
    const outcomeModel = extractOutcomeModel(content);
    const anomalies = extractAnomalies(content);

    // Extract narrative components for consultant-style presentation
    const executiveBrief = extractExecutiveBrief(content);
    const conclusion = extractConclusion(content);

    // NEW: Extract hero insight and Monday morning actions
    const heroInsight = extractHeroInsight(content, metrics);
    const mondayActions = generateMondayActions(content, metrics, anomalies);
    const segmentComparisonData = extractSegmentData(content);

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
            toast({
                title: "✅ Copied to clipboard!",
                description: "Report content ready to paste"
            });
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast({
                title: "❌ Failed to copy",
                description: "Please try again",
                variant: "destructive"
            });
        }
    };

    const handleDownloadMarkdown = () => {
        const filename = runId ? `ace-report-${runId}.md` : "ace-report.md";
        downloadMarkdown(content, filename);
        toast({
            title: "⬇️ Markdown downloaded",
            description: filename
        });
    };

    const handleSectionClick = (sectionId: string) => {
        setCurrentSection(sectionId);
    };

    // Build accordion sections from content with intelligent routing
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

        // Add anomaly banner if anomalies detected
        ...(anomalies && anomalies.count > 0 ? [{
            id: "anomalies-alert",
            title: `⚠️ ${anomalies.count} Anomalies Detected`,
            icon: SECTION_ICONS.warning,
            defaultOpen: true,
            content: (
                <AnomalyBanner
                    count={anomalies.count}
                    totalRecords={metrics.recordsProcessed}
                    topDrivers={anomalies.drivers?.map(d => `${d.field}: ${Math.round(d.score * 100)}%`) || []}
                />
            ),
        }] : []),

        {
            id: "visualizations",
            title: "Data Visualizations",
            icon: SECTION_ICONS.quality,
            defaultOpen: true,
            content: (
                <div className="space-y-8">
                    {/* Segment Comparison - Visual Hierarchy for Differentiation */}
                    {segmentComparisonData && segmentComparisonData.length > 0 && (
                        <SegmentComparison
                            segments={segmentComparisonData}
                            totalCustomers={metrics.recordsProcessed || 10000}
                        />
                    )}

                    {/* Key Metrics with Interpretations - Educational Layer */}
                    <MetricGrid
                        metrics={[
                            {
                                name: "Data Quality Score",
                                value: `${metrics.dataQualityScore || 0}%`,
                                interpretation: interpretDataQuality(metrics.dataQualityScore || 0),
                                benchmark: "Target: 85%+ for reliable insights",
                                confidenceLevel: (metrics.dataQualityScore || 0) >= 85 ? "high" : (metrics.dataQualityScore || 0) >= 70 ? "medium" : "low",
                                helpText: "Measures completeness, consistency, and accuracy of your dataset"
                            },
                            ...(clusterMetrics?.silhouetteScore ? [{
                                name: "Clustering Quality (Silhouette Score)",
                                value: clusterMetrics.silhouetteScore.toFixed(2),
                                interpretation: interpretSilhouetteScore(clusterMetrics.silhouetteScore),
                                benchmark: "Good: 0.51-0.70, Excellent: 0.71+",
                                confidenceLevel: clusterMetrics.silhouetteScore >= 0.51 ? "high" : "medium" as "high" | "medium",
                                helpText: "Indicates how well-separated and distinct your customer segments are"
                            }] : []),
                            ...(outcomeModel?.r2Score !== undefined ? [{
                                name: "Model Fit (R² Score)",
                                value: outcomeModel.r2Score.toFixed(3),
                                interpretation: interpretR2Score(outcomeModel.r2Score),
                                benchmark: "Good: 0.50-0.89, Excellent: 0.90+",
                                confidenceLevel: outcomeModel.r2Score >= 0.50 ? "high" : outcomeModel.r2Score >= 0 ? "medium" : "low" as "high" | "medium" | "low",
                                helpText: "Shows how well the model explains variance in your target outcome"
                            }] : [])
                        ]}
                    />

                    {/* Business Intelligence Dashboard */}
                    {enhancedAnalytics?.business_intelligence?.available && (
                        <BusinessIntelligenceDashboard
                            valueMetrics={enhancedAnalytics.business_intelligence.value_metrics}
                            clvProxy={enhancedAnalytics.business_intelligence.clv_proxy}
                            segmentValue={enhancedAnalytics.business_intelligence.segment_value}
                            churnRisk={enhancedAnalytics.business_intelligence.churn_risk}
                            insights={enhancedAnalytics.business_intelligence.insights}
                        />
                    )}

                    {/* Correlation Analysis */}
                    {enhancedAnalytics?.correlation_analysis?.available &&
                     enhancedAnalytics.correlation_analysis.strong_correlations && (
                        <CorrelationHeatmap
                            correlations={enhancedAnalytics.correlation_analysis.strong_correlations}
                            insights={enhancedAnalytics.correlation_analysis.insights}
                        />
                    )}

                    {/* Distribution Analysis */}
                    {enhancedAnalytics?.distribution_analysis?.available &&
                     enhancedAnalytics.distribution_analysis.distributions && (
                        <DistributionCharts
                            distributions={enhancedAnalytics.distribution_analysis.distributions}
                            insights={enhancedAnalytics.distribution_analysis.insights}
                        />
                    )}

                    {/* Cluster Gauges */}
                    {clusterMetrics && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Behavioral Clusters</h3>
                            <ClusterGaugeSection data={clusterMetrics} />
                        </div>
                    )}

                    {/* Personas */}
                    {personas.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Customer Personas</h3>
                            <PersonaSection personas={personas} />
                        </div>
                    )}

                    {/* Outcome Model */}
                    {outcomeModel && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Outcome Modeling</h3>
                            <OutcomeModelSection data={outcomeModel} />
                        </div>
                    )}

                    {/* Fallback Charts */}
                    {(!clusterMetrics && !personas.length && !outcomeModel && !enhancedAnalytics) && (
                        <ReportCharts
                            qualityScore={metrics.dataQualityScore}
                            segmentData={segmentData}
                            compositionData={compositionData}
                        />
                    )}
                </div>
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
                        {/* Hero Insight Panel - The Dominant Visual Anchor */}
                        <HeroInsightPanel {...heroInsight} />

                        {/* Monday Morning Actions */}
                        <MondayMorningActions actions={mondayActions} className="mt-8" />

                        {/* Export Toolbar */}
                        <div className="flex gap-2 justify-end flex-wrap mt-8 mb-6">
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

                        {/* Executive Brief - Consultant Summary */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <ExecutiveBrief
                                purpose={executiveBrief.purpose}
                                keyFindings={executiveBrief.keyFindings}
                                confidenceVerdict={executiveBrief.confidenceVerdict}
                                recommendedAction={executiveBrief.recommendedAction}
                            />
                        </motion.div>

                        {/* Technical Details - Collapsible */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <TechnicalDetailsSection
                                metrics={metrics}
                                runId={runId}
                            />
                        </motion.div>
                    </>
                }
                mainContent={
                    <div id="report-content" className="space-y-8">
                        <ReportAccordion sections={accordionSections} />

                        {/* Report Conclusion - Decision Boundaries */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <ReportConclusion
                                shouldUseFor={conclusion.shouldUseFor}
                                shouldNotUseFor={conclusion.shouldNotUseFor}
                                nextStep={conclusion.nextStep}
                            />
                        </motion.div>
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
