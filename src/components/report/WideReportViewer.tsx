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
    parseClusterMetrics,
    extractPersonas,
    extractOutcomeModel,
    extractAnomalies
} from "@/lib/reportParser";
import { useState, useEffect, useMemo } from "react";
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
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useModelArtifacts } from "@/hooks/useModelArtifacts";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { DistributionCharts } from "./DistributionCharts";
import { BusinessIntelligenceDashboard } from "./BusinessIntelligenceDashboard";
import { HeroInsightPanel } from "./HeroInsightPanel";
import { MondayMorningActions } from "./MondayMorningActions";
import { SegmentComparison } from "./SegmentComparison";
import { SegmentOverviewTable } from "./SegmentOverviewTable";
import { MetricGrid, interpretSilhouetteScore, interpretR2Score, interpretDataQuality } from "./MetricInterpretation";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

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
    const [confidenceMode, setConfidenceMode] = useState<"strict" | "exploratory">("exploratory");
    const confidenceThreshold = confidenceMode === "strict" ? 90 : 60;
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
    const [evidenceSample, setEvidenceSample] = useState<any[] | null>(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidenceError, setEvidenceError] = useState<string | null>(null);
    const { toast } = useToast();

    const { data: enhancedAnalytics, loading: analyticsLoading } = useEnhancedAnalytics(runId);
    const { data: diagnostics } = useDiagnostics(runId);
    const { data: modelArtifacts } = useModelArtifacts(runId);

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
    const measurableSegments = useMemo(
        () =>
            (segmentData || []).map((seg: any) => ({
                ...seg,
                label: seg?.label ? `${seg.label}` : "Segment",
                subtitle: seg?.avgValue ? `avg=${Math.round(seg.avgValue)}` : undefined,
            })),
        [segmentData]
    );

    // NEW: Extract structured data for visual components
    const clusterMetrics = parseClusterMetrics(content);
    const personas = extractPersonas(content);
    const outcomeModel = extractOutcomeModel(content);
    const anomalies = extractAnomalies(content);

    // Extract narrative components for consultant-style presentation
    const executiveBrief = useMemo(() => extractExecutiveBrief(content), [content]);
    const conclusion = useMemo(() => extractConclusion(content), [content]);

    // NEW: Extract hero insight and Monday morning actions
    const heroInsight = useMemo(() => extractHeroInsight(content, metrics), [content, metrics]);
    const mondayActions = useMemo(() => generateMondayActions(content, metrics, anomalies), [content, metrics, anomalies]);
    const segmentComparisonData = useMemo(() => extractSegmentData(content), [content]);

    // Extract key insights for intelligence rail
    const keyTakeaways = useMemo(() =>
        content
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 20 && line.length < 150)
            .slice(0, 5),
        [content]
    );

    const limitationsMode = useMemo(() => {
        const lower = content.toLowerCase();
        const signals = [
            "mode: limitations",
            "insights suppressed",
            "suppressed due to confidence",
            "suppressed due to contract",
            "suppressed due to validation"
        ];
        const hasSignal = signals.some((sig) => lower.includes(sig));
        const lowConfidence = typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel <= 5;
        return hasSignal || lowConfidence;
    }, [content, metrics]);

    const shouldEmitInsights =
        !limitationsMode &&
        (typeof metrics.confidenceLevel !== "number" || metrics.confidenceLevel >= confidenceThreshold);

    const taskContractSection = useMemo(
        () => sections.find((s) => s.title.toLowerCase().includes("contract")),
        [sections]
    );
    const decisionSection = useMemo(
        () => sections.find((s) => s.title.toLowerCase().includes("decision") || s.title.toLowerCase().includes("purpose")),
        [sections]
    );

    const summarize = (text?: string) => text ? text.split('\n').slice(0, 4).join('\n').slice(0, 600) : undefined;
    const decisionSummary = summarize(decisionSection?.content);
    const taskContractSummary = summarize(taskContractSection?.content);

    const uncertaintySignals = useMemo(() => {
        const lower = content.toLowerCase();
        const signals: string[] = [];
        if (limitationsMode) {
            signals.push("Insights suppressed by confidence/contract/validation gates.");
        }
        if (typeof metrics.confidenceLevel === "number") {
            signals.push(`Confidence: ${metrics.confidenceLevel}%`);
        }
        if (lower.includes("conflict")) {
            signals.push("Report text mentions conflicts across datasets or models.");
        }
        return signals;
    }, [content, limitationsMode, metrics]);

    // Derived Safe Mode and gating flags
    const safeMode =
        limitationsMode ||
        (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold);
    const hideActions =
        safeMode || (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold);

    // Identity + trust snapshots (best-effort from metrics / enhanced analytics)
    const identityStats = {
        rows: enhancedAnalytics?.quality_metrics?.total_records ?? metrics.totalRows ?? "n/a",
        completeness: enhancedAnalytics?.quality_metrics?.overall_completeness,
        confidence: diagnostics?.confidence?.data_confidence ?? metrics.confidenceLevel ?? "n/a",
    };

    const renderSafeModeBanner = () => {
        if (!safeMode) return null;
        return (
            <Card className="mb-4 border-amber-400 bg-amber-50 text-amber-900">
                <div className="flex items-start gap-3 p-4">
                    <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                        <div className="font-semibold">Safe Mode (Descriptive Only)</div>
                        <p className="text-sm text-amber-800">
                            Validation or confidence gates are active. Insights are limited; recommendations may be hidden.
                        </p>
                    </div>
                </div>
            </Card>
        );
    };

    const safeModeReasons = useMemo(() => {
        const reasons: string[] = [];
        if (diagnostics?.reasons?.length) reasons.push(...diagnostics.reasons);
        if (limitationsMode) reasons.push("Validation/contract gates active (limitations mode).");
        if (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold) {
            reasons.push(`Confidence ${metrics.confidenceLevel}% below threshold ${confidenceThreshold}%.`);
        }
        if (!hasTimeField) reasons.push("Time fields not detected; time-series suppressed.");
        if (evidenceSections.length === 0) reasons.push("No evidence-bearing sections detected.");
        return Array.from(new Set(reasons));
    }, [diagnostics?.reasons, limitationsMode, metrics.confidenceLevel, confidenceThreshold, hasTimeField, evidenceSections.length]);

    const renderDiagnosticsCard = () => (
        <Card className="mb-4 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                    <div className="text-xs uppercase text-muted-foreground">Diagnostics</div>
                    <div className="text-sm font-semibold">Why Am I in Safe Mode?</div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={confidenceMode === "strict" ? "default" : "outline"}
                        onClick={() => setConfidenceMode("strict")}
                    >
                        Strict (&gt;=90%)
                    </Button>
                    <Button
                        size="sm"
                        variant={confidenceMode === "exploratory" ? "default" : "outline"}
                        onClick={() => setConfidenceMode("exploratory")}
                    >
                        Exploratory (&gt;=60%)
                    </Button>
                </div>
            </div>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {safeModeReasons.length === 0 && <li>No blocking reasons detected.</li>}
                {safeModeReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                ))}
            </ul>
            <div className="mt-2 text-xs text-muted-foreground">
                Scope check: {(decisionSummary || taskContractSummary) ? "OK" : "No contract/scope provided"} • Fields: {hasTimeField ? "Time present" : "Time missing"}
            </div>
        </Card>
    );

    const renderHero = () => (
        <Card className="mb-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="text-xs uppercase text-muted-foreground">Report</div>
                    <div className="text-xl font-semibold">ACE Report Viewer</div>
                    {runId && (
                        <div className="text-xs text-muted-foreground">Run ID: {runId}</div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {safeMode && <Badge variant="outline" className="border-amber-500 text-amber-700">Safe Mode</Badge>}
                    <Badge variant="outline">Confidence: {metrics.confidenceLevel ?? "n/a"}%</Badge>
                </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Card className="p-3 bg-muted/50">
                    <div className="text-xs uppercase text-muted-foreground">Task Contract</div>
                    <div className="text-sm whitespace-pre-line">{taskContractSummary || "Contract not provided."}</div>
                </Card>
                <Card className="p-3 bg-muted/50">
                    <div className="text-xs uppercase text-muted-foreground">Scope / Decision</div>
                    <div className="text-sm whitespace-pre-line">{decisionSummary || "Scope not provided."}</div>
                </Card>
            </div>
        </Card>
    );

    const renderIdentityTrust = () => (
        <div className="grid gap-3 md:grid-cols-2 mb-4">
            <Card className="p-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Dataset Identity</span>
                    <Badge variant="secondary">Top-of-fold</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">Rows: {identityStats.rows}</div>
                {identityStats.completeness !== undefined && (
                    <div className="text-sm text-muted-foreground">
                        Completeness: {(identityStats.completeness * 100).toFixed(1)}%
                    </div>
                )}
            </Card>
            <Card className="p-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Trust & Validation</span>
                    <Badge variant="secondary">Confidence-aware</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                    Confidence: {metrics.confidenceLevel ?? "n/a"}%
                </div>
                {uncertaintySignals.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
                        {uncertaintySignals.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );

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

    const handleFetchEvidenceSample = async (contentSnippet: string) => {
        if (!runId) {
            setEvidenceError("Run ID not available");
            return;
        }
        setEvidencePreview(contentSnippet);
        setEvidenceLoading(true);
        setEvidenceError(null);
        setEvidenceSample(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8001";
            const res = await fetch(`${apiUrl}/runs/${runId}/evidence/sample?rows=5`);
            if (!res.ok) {
                throw new Error(`Failed to fetch evidence sample: ${res.statusText}`);
            }
            const json = await res.json();
            setEvidenceSample(json.rows || []);
        } catch (err) {
            setEvidenceError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setEvidenceLoading(false);
        }
    };

    // Evidence-first gating: only keep sections that mention evidence/data columns
    const hasTimeField = useMemo(() => {
        const lower = content.toLowerCase();
        return lower.includes("date") || lower.includes("time");
    }, [content]);

    const filteredSections = useMemo(
        () =>
            sections.filter((s) => {
                const lowerTitle = s.title.toLowerCase();
                const lowerContent = s.content.toLowerCase();
                if (!hasTimeField && (lowerTitle.includes("time") || lowerTitle.includes("forecast") || lowerContent.includes("time-series") || lowerContent.includes("forecast"))) {
                    return false;
                }
                return true;
            }),
        [sections, hasTimeField]
    );

    const evidenceSections = useMemo(
        () =>
            filteredSections.filter((s) => {
                const lower = s.content.toLowerCase();
                return lower.includes("evidence") || lower.includes("column") || lower.includes("data");
            }),
        [filteredSections]
    );

    useEffect(() => {
        if (evidenceSections.length === 0) {
            console.warn("Evidence gating removed all sections; report may show only system banners.");
        }
    }, [evidenceSections.length]);

    const limitationFootnote = useMemo(() => {
        if (!hasTimeField) return "Time analysis suppressed: no date/time fields detected.";
        return null;
    }, [hasTimeField]);

    // Build accordion sections from content with intelligent routing
    const accordionSections = [
        ...(limitationsMode ? [{
            id: "limitations",
            title: "Insights Suppressed",
            icon: SECTION_ICONS.anomalies,
            defaultOpen: true,
            content: (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30">
                    Insights are in limitations mode due to confidence/contract/validation gates. Rankings, risk labels, and strategies are withheld until the gates clear.
                </div>
            ),
        }] : []),

        ...(uncertaintySignals.length > 0 ? [{
            id: "uncertainty",
            title: "Uncertainty & Conflicts",
            icon: SECTION_ICONS.anomalies,
            defaultOpen: true,
            content: (
                <ul className="list-disc pl-5 text-sm space-y-2 text-foreground">
                    {uncertaintySignals.map((sig, idx) => (
                        <li key={idx}>{sig}</li>
                    ))}
                </ul>
            ),
        }] : []),

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

        ...(shouldEmitInsights && measurableSegments && measurableSegments.length > 0 ? [{
            id: "segments",
            title: "Customer Segments & Actions",
            icon: SECTION_ICONS.summary,
            defaultOpen: true,
            content: (
                <div className="space-y-8">
                    <SegmentOverviewTable
                        segments={measurableSegments}
                        totalCustomers={metrics.recordsProcessed || 10000}
                    />
                    <SegmentComparison
                        segments={measurableSegments}
                        totalCustomers={metrics.recordsProcessed || 10000}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        {measurableSegments.map((seg, idx) => (
                            <Card key={idx} className="p-3">
                                <div className="text-sm font-semibold">Segment {idx + 1}</div>
                                <div className="text-xs text-muted-foreground">
                                    {seg.subtitle || "Data-driven segment"}{seg.mean && ` • mean=${Math.round(seg.mean)}`}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            ),
        }] : []),

        {
            id: "visualizations",
            title: "Data Visualizations",
            icon: SECTION_ICONS.quality,
            defaultOpen: true,
            content: (
                <div className="space-y-8">
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
                            ...(shouldEmitInsights && clusterMetrics?.silhouetteScore ? [{
                                name: "Clustering Quality (Silhouette Score)",
                                value: clusterMetrics.silhouetteScore.toFixed(2),
                                interpretation: interpretSilhouetteScore(clusterMetrics.silhouetteScore),
                                benchmark: "Good: 0.51-0.70, Excellent: 0.71+",
                                confidenceLevel: clusterMetrics.silhouetteScore >= 0.51 ? "high" : "medium" as "high" | "medium",
                                helpText: "Indicates how well-separated and distinct your customer segments are"
                            }] : []),
                            ...(shouldEmitInsights && outcomeModel?.r2Score !== undefined ? [{
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
                    {shouldEmitInsights && enhancedAnalytics?.business_intelligence?.available && (
                        <BusinessIntelligenceDashboard
                            valueMetrics={enhancedAnalytics.business_intelligence.value_metrics}
                            clvProxy={enhancedAnalytics.business_intelligence.clv_proxy}
                            segmentValue={enhancedAnalytics.business_intelligence.segment_value}
                            churnRisk={enhancedAnalytics.business_intelligence.churn_risk}
                            insights={enhancedAnalytics.business_intelligence.insights}
                            evidence={enhancedAnalytics.business_intelligence.evidence}
                        />
                    )}

                    {/* Model Transparency */}
                    {(enhancedAnalytics?.feature_importance?.feature_importance || modelArtifacts?.feature_importance) && (
                        <Card className="p-3">
                            <div className="text-sm font-semibold mb-2">Model Drivers</div>
                            <ul className="text-sm space-y-1">
                                {(enhancedAnalytics?.feature_importance?.feature_importance || modelArtifacts?.feature_importance || []).slice(0, 5).map((f: any, i: number) => (
                                    <li key={i} className="flex justify-between">
                                        <span>{f.feature || f[0]}</span>
                                        <span className="text-muted-foreground">{(f.importance || f[1])?.toFixed?.(3) ?? f.importance ?? f[1]}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* Correlation Analysis */}
                    {shouldEmitInsights && enhancedAnalytics?.correlation_analysis?.available &&
                     enhancedAnalytics.correlation_analysis.strong_correlations && (
                        <CorrelationHeatmap
                            correlations={enhancedAnalytics.correlation_analysis.strong_correlations}
                            insights={enhancedAnalytics.correlation_analysis.insights}
                        />
                    )}

                    {/* Distribution Analysis */}
                    {shouldEmitInsights && enhancedAnalytics?.distribution_analysis?.available &&
                     enhancedAnalytics.distribution_analysis.distributions && (
                        <DistributionCharts
                            distributions={enhancedAnalytics.distribution_analysis.distributions}
                            insights={enhancedAnalytics.distribution_analysis.insights}
                        />
                    )}

                    {/* Cluster Gauges */}
                    {shouldEmitInsights && clusterMetrics && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Behavioral Clusters</h3>
                            <ClusterGaugeSection data={clusterMetrics} />
                        </div>
                    )}

                    {/* Fallback Charts */}
                    {shouldEmitInsights && (!clusterMetrics && !personas.length && !outcomeModel && !enhancedAnalytics) && (
                        <ReportCharts
                            qualityScore={metrics.dataQualityScore}
                            segmentData={segmentData}
                            compositionData={compositionData}
                        />
                    )}
                </div>
            ),
        },

        ...(shouldEmitInsights && personas.length > 0 ? [{
            id: "personas",
            title: "Customer Personas",
            icon: SECTION_ICONS.insights,
            defaultOpen: false,
            content: (
                <div>
                    <PersonaSection personas={personas} />
                </div>
            ),
        }] : []),

        ...(shouldEmitInsights && outcomeModel ? [{
            id: "outcome-model",
            title: "Outcome Modeling",
            icon: SECTION_ICONS.anomalies,
            defaultOpen: false,
            content: (
                <div>
                    <OutcomeModelSection data={outcomeModel} />
                </div>
            ),
        }] : []),

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
                    {limitationFootnote && (
                        <div className="mt-4 text-xs text-muted-foreground">
                            {limitationFootnote}
                        </div>
                    )}
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
                        {renderSafeModeBanner()}
                        {renderHero()}
                        {renderIdentityTrust()}
                        {renderDiagnosticsCard()}

                        {/* Hero Insight Panel - The Dominant Visual Anchor */}
                        {shouldEmitInsights ? (
                            <>
                                <HeroInsightPanel {...heroInsight} />
                                {mondayActions.length > 0 && !hideActions && (
                                    <MondayMorningActions actions={mondayActions} className="mt-8" />
                                )}
                            </>
                        ) : (
                            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-6 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30">
                                Insights are suppressed due to confidence/contract/validation gates. No rankings, risk labels, or strategies are shown until data quality and confidence improve.
                            </div>
                        )}

                        {(decisionSummary || taskContractSummary) && (
                            <div className="mt-6 rounded-lg border bg-muted/30 p-4 space-y-2">
                                <div className="text-sm font-semibold text-foreground">Decision & Task Contract</div>
                                {decisionSummary && (
                                    <p className="text-sm text-foreground whitespace-pre-line">
                                        {decisionSummary}
                                    </p>
                                )}
                                {taskContractSummary && (
                                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                                        {taskContractSummary}
                                    </p>
                                )}
                            </div>
                        )}

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
                            <Button
                                onClick={() => toast({ title: "Run diff", description: "Diff view not available in this build." })}
                                variant="outline"
                                size="sm"
                            >
                                Run Diff
                            </Button>
                            <Button
                                onClick={() => toast({ title: "PPTX export", description: "Evidence deck export not available in this build." })}
                                variant="outline"
                                size="sm"
                            >
                                PPTX
                            </Button>
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

                        {/* Evidence Drill-Down */}
                        {evidenceSections.length > 0 && (
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">Evidence Inspector</div>
                                        <div className="text-sm font-semibold">Click to inspect evidence</div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {evidenceSections.map((sec, idx) => (
                                        <div key={idx} className="flex items-start gap-3 border rounded-md p-2">
                                            <div className="text-xs font-semibold text-muted-foreground">#{idx + 1}</div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium">{sec.title}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-2">{sec.content}</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleFetchEvidenceSample(sec.content)}
                                            >
                                                Inspect
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {evidencePreview && (
                                    <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
                                        <div className="font-semibold mb-1">Sample Rows</div>
                                        {evidenceLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
                                        {evidenceError && <div className="text-xs text-red-600">{evidenceError}</div>}
                                        {evidenceSample && evidenceSample.length > 0 && (
                                            <pre className="mt-2 text-xs whitespace-pre-wrap">
{JSON.stringify(evidenceSample, null, 2)}
                                            </pre>
                                        )}
                                        {!evidenceLoading && !evidenceSample && !evidenceError && (
                                            <div className="text-xs text-muted-foreground">No sample returned.</div>
                                        )}
                                        <div className="mt-2">
                                            <Button size="sm" onClick={() => { setEvidencePreview(null); setEvidenceSample(null); setEvidenceError(null); }}>Close</Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Action Priority Matrix (stub) */}
                        {mondayActions.length > 0 && (
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">Actions</div>
                                        <div className="text-sm font-semibold">Confidence vs Impact</div>
                                    </div>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {mondayActions.map((a, idx) => (
                                        <div key={idx} className="border rounded-md p-2 text-sm">
                                            <div className="font-semibold">{a.title || `Action ${idx + 1}`}</div>
                                            <div className="text-xs text-muted-foreground">{a.description || a}</div>
                                            <div className="mt-1 text-xs">Confidence: {metrics.confidenceLevel ?? "n/a"}%</div>
                                            {hideActions && <div className="text-xs text-amber-700">Hidden in strict mode</div>}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

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
                        <Card className="p-3 space-y-1">
                            <div className="text-xs uppercase text-muted-foreground">Traceability</div>
                            {runId && <div className="text-sm">Run ID: {runId}</div>}
                            <div className="text-sm">Safe Mode: {safeMode ? "Yes" : "No"}</div>
                            <div className="text-xs text-muted-foreground">Engine: ACE Viewer</div>
                        </Card>
                        <TableOfContents
                            sections={evidenceSections}
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
                            sections={evidenceSections.map(s => ({ id: s.id, title: s.title }))}
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
