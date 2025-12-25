import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PDFExporter, downloadMarkdown, copyToClipboard } from "./PDFExporter";
import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedAnalytics } from "@/hooks/useEnhancedAnalytics";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { useModelArtifacts } from "@/hooks/useModelArtifacts";
import { ReportSkeleton } from "./ReportSkeleton";
import { ExecutiveReportLayout } from "./ExecutiveReportLayout";
import { MetricCardRow } from "./consultant/MetricCardRow";
import { AllocationChart } from "./consultant/AllocationChart";
import { ExecutiveNarrative } from "./consultant/ExecutiveNarrative";
import { DataTable } from "./consultant/DataTable";
import { InteractiveLineChart } from "./consultant/charts/InteractiveLineChart";
import { IntelligenceRail } from "./IntelligenceRail";
import { ReportMetadata } from "./ReportMetadata";
import {
  transformToMetricCards,
  transformToAllocationData,
  transformToTrendData,
  transformToTableData,
  extractNarrativeContent,
  hasVisualizableData
} from "@/lib/reportDataTransformer";
import { 
  extractMetrics, 
  extractSections, 
  extractProgressMetrics, 
  extractChartData, 
  parseClusterMetrics, 
  extractPersonas, 
  extractOutcomeModel,
  extractAnomalies 
} from "@/lib/reportParser";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";
import { extractExecutiveBrief, extractConclusion } from "@/lib/narrativeExtractors";
import { HeroInsightPanel } from "./HeroInsightPanel";
import { MondayMorningActions } from "./MondayMorningActions";
import { SECTION_ICONS, ReportAccordion } from "./ReportAccordion";
import { PersonaSection } from "./PersonaSection";
import { OutcomeModelSection } from "./OutcomeModelSection";
import { ExecutiveBrief } from "./ExecutiveBrief";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, FileDown, ShieldAlert } from "lucide-react";
import { AnomalyBanner } from "./AnomalyBanner";
import { SegmentOverviewTable } from "./SegmentOverviewTable";
import { SegmentComparison } from "./SegmentComparison";
import { MetricGrid, interpretSilhouetteScore, interpretR2Score, interpretDataQuality } from "./MetricInterpretation";
import { BusinessIntelligenceDashboard } from "./BusinessIntelligenceDashboard";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { DistributionCharts } from "./DistributionCharts";
import { ClusterGaugeSection } from "./ClusterGaugeSection";
import { ReportCharts } from "./ReportCharts";
import { WideReportLayout } from "./WideReportLayout";
import { TechnicalDetailsSection } from "./TechnicalDetailsSection";
import { ReportConclusion } from "./ReportConclusion";

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
    const [showAllActions, setShowAllActions] = useState(false);
    const [showAllPersonas, setShowAllPersonas] = useState(false);
    const [diffRunId, setDiffRunId] = useState("");
    const [diffData, setDiffData] = useState<any | null>(null);
    const [diffLoading, setDiffLoading] = useState(false);
    const [diffError, setDiffError] = useState<string | null>(null);
    const [pptxLoading, setPptxLoading] = useState(false);
    const [pptxError, setPptxError] = useState<string | null>(null);
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

    const confidenceValue = typeof metrics.confidenceLevel === "number"
        ? metrics.confidenceLevel
        : Number.isFinite(Number(metrics.confidenceLevel))
            ? Number(metrics.confidenceLevel)
            : undefined;
    const dataQualityValue = typeof metrics.dataQualityScore === "number"
        ? metrics.dataQualityScore
        : Number.isFinite(Number(metrics.dataQualityScore))
            ? Number(metrics.dataQualityScore)
            : undefined;

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

    const safeMode =
        limitationsMode ||
        (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold);
    const hideActions =
        safeMode || (typeof metrics.confidenceLevel === "number" && metrics.confidenceLevel < confidenceThreshold);

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

    // Evidence-first gating: detect time fields and filter sections accordingly
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

    const narrativeSummary = useMemo(() => {
        const wins: string[] = keyTakeaways.slice(0, 2);
        const risks: string[] = [];
        if (uncertaintySignals.length) {
            risks.push(...uncertaintySignals.slice(0, 2));
        }
        if (diagnostics?.validation?.failed_fields?.length) {
            risks.push(`Validation gaps: ${diagnostics.validation.failed_fields.slice(0, 3).join(", ")}`);
        }
        const meaning: string[] = [];
        if (safeMode) meaning.push("Safe Mode limits ranking/strategies; use exploratory toggle for a preview.");
        if (confidenceValue !== undefined) meaning.push(`Confidence sits at ${confidenceValue}% (${confidenceMode}).`);
        if (!hasTimeField) meaning.push("Time-based insights are off; add date/time to enable trend views.");
        return {
            wins: wins.length ? wins : ["No high-confidence wins detected."],
            risks: risks.length ? risks : ["No major risks detected."],
            meaning: meaning.length ? meaning : ["Data quality and scope look acceptable for a quick read."]
        };
    }, [keyTakeaways, uncertaintySignals, diagnostics?.validation?.failed_fields, safeMode, confidenceValue, confidenceMode, hasTimeField]);

    const runContext = useMemo(() => {
        const mode = diagnostics?.mode || (enhancedAnalytics?.mode as string) || (safeMode ? "safe" : "standard");
        const freshness = enhancedAnalytics?.data_freshness || metrics.dataFreshness || "unknown";
        const scopeLimits: string[] = [];
        if (!hasTimeField) scopeLimits.push("No time field");
        if (limitationsMode) scopeLimits.push("Limitations mode");
        return {
            mode,
            freshness,
            scopeLimits: scopeLimits.length ? scopeLimits : ["None flagged"]
        };
    }, [diagnostics?.mode, enhancedAnalytics?.mode, enhancedAnalytics?.data_freshness, metrics.dataFreshness, safeMode, hasTimeField, limitationsMode]);

    // Identity + trust snapshots (best-effort from metrics / enhanced analytics)
    const identityStats = {
        rows: enhancedAnalytics?.quality_metrics?.total_records ?? metrics.totalRows ?? "n/a",
        completeness: enhancedAnalytics?.quality_metrics?.overall_completeness,
        confidence: diagnostics?.confidence?.data_confidence ?? metrics.confidenceLevel ?? "n/a",
    };

    const highlights = useMemo(() => {
        const chips: { label: string; tone: "default" | "warn" | "ok" }[] = [];
        if (heroInsight?.title) chips.push({ label: `Top insight: ${heroInsight.title}`, tone: "default" });
        if (mondayActions?.[0]) chips.push({ label: `Top action: ${mondayActions[0].title || "Action 1"}`, tone: "default" });
        if (personas?.[0]?.label) chips.push({ label: `Segment: ${personas[0].label}`, tone: "default" });
        if (anomalies?.count) chips.push({ label: `${anomalies.count} anomalies`, tone: "warn" });
        if (confidenceValue !== undefined) {
            const tone = confidenceValue >= confidenceThreshold ? "ok" : "warn";
            chips.push({ label: `Confidence ${confidenceValue}%`, tone });
        }
        if (identityStats.rows && identityStats.rows !== "n/a") {
            chips.push({ label: `Rows: ${identityStats.rows}`, tone: "default" });
        }
        if (safeMode) chips.push({ label: "Safe Mode active", tone: "warn" });
        if (chips.length === 0) chips.push({ label: "No highlights available", tone: "default" });
        return chips.slice(0, 5);
    }, [heroInsight?.title, mondayActions, personas, anomalies?.count, confidenceValue, confidenceThreshold, safeMode, identityStats.rows]);

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

    const renderInlineVisuals = () => (
        <div className="grid gap-3 md:grid-cols-3 mb-4">
            {/** Confidence bar */}
            <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">Confidence</div>
                <div className="text-lg font-semibold">{confidenceValue ?? "n/a"}%</div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, confidenceValue || 0))}%` }}
                    />
                </div>
            </Card>
            {/** Data quality bar */}
            <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">Data Quality</div>
                <div className="text-lg font-semibold">{dataQualityValue ?? "n/a"}%</div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${Math.min(100, Math.max(0, dataQualityValue || 0))}%` }}
                    />
                </div>
            </Card>
            {/** Cluster mini-map */}
            <Card className="p-3">
                <div className="text-xs uppercase text-muted-foreground">Clusters</div>
                <div className="text-sm text-muted-foreground">
                    {clusterMetrics?.clusterCount ? `${clusterMetrics.clusterCount} clusters` : "n/a"}
                </div>
                {clusterMetrics?.clusterSizes && clusterMetrics.clusterSizes.length > 0 ? (
                    <div className="mt-2 flex gap-1">
                        {clusterMetrics.clusterSizes.slice(0, 6).map((size: number, idx: number) => {
                            const maxSize = Math.max(...clusterMetrics.clusterSizes);
                            const opacity = maxSize > 0 ? 0.6 + (size / maxSize) * 0.4 : 0.6;
                            return (
                                <div
                                    key={idx}
                                    className="flex-1 h-2 rounded-full bg-blue-500/70"
                                    style={{ opacity }}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-2 text-xs text-muted-foreground">No cluster sizes available</div>
                )}
            </Card>
        </div>
    );

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

            {/* Run context strip */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Mode: {runContext.mode}</Badge>
                <Badge variant="secondary">Freshness: {runContext.freshness}</Badge>
                {runContext.scopeLimits.map((lim, idx) => (
                    <Badge key={idx} variant="outline">{lim}</Badge>
                ))}
            </div>

            {/* Narrative summary */}
            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Card className="p-3 bg-muted/40">
                    <div className="text-xs uppercase text-muted-foreground">Key Wins</div>
                    <ul className="mt-1 text-sm space-y-1">
                        {narrativeSummary.wins.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                </Card>
                <Card className="p-3 bg-muted/40">
                    <div className="text-xs uppercase text-muted-foreground">Risks</div>
                    <ul className="mt-1 text-sm space-y-1">
                        {narrativeSummary.risks.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                </Card>
                <Card className="p-3 bg-muted/40">
                    <div className="text-xs uppercase text-muted-foreground">What This Means</div>
                    <ul className="mt-1 text-sm space-y-1">
                        {narrativeSummary.meaning.map((m, i) => <li key={i}>• {m}</li>)}
                    </ul>
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

    const handleRunDiff = async () => {
        if (!runId || !diffRunId) {
            setDiffError("Provide both current run and comparison run ID.");
            return;
        }
        setDiffLoading(true);
        setDiffError(null);
        setDiffData(null);
        try {
            const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:8001";
            const res = await fetch(`${apiUrl}/runs/${runId}/diff/${diffRunId}`);
            if (!res.ok) throw new Error(`Diff failed: ${res.statusText}`);
            const json = await res.json();
            setDiffData(json);
        } catch (err) {
            setDiffError(err instanceof Error ? err.message : "Unknown diff error");
        } finally {
            setDiffLoading(false);
        }
    };

    const handlePptxExport = async () => {
        if (!runId) {
            setPptxError("Run ID missing");
            return;
        }
        setPptxLoading(true);
        setPptxError(null);
        try {
            const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:8001";
            const res = await fetch(`${apiUrl}/runs/${runId}/pptx`);
            if (!res.ok) throw new Error(`PPTX export failed: ${res.statusText}`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = runId ? `ace-report-${runId}.pptx` : "ace-report.pptx";
            a.click();
            window.URL.revokeObjectURL(url);
            toast({ title: "PPTX export ready", description: a.download });
        } catch (err) {
            setPptxError(err instanceof Error ? err.message : "Unknown PPTX error");
        } finally {
            setPptxLoading(false);
        }
    };

    const handleFetchEvidenceSample = async (contentSnippet: string, evidenceId?: string) => {
        if (!runId) {
            setEvidenceError("Run ID not available");
            return;
        }
        setEvidencePreview(contentSnippet);
        setEvidenceLoading(true);
        setEvidenceError(null);
        setEvidenceSample(null);
        try {
            const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:8001";
            const qs = new URLSearchParams({ rows: "5", ...(evidenceId ? { evidence_id: evidenceId } : {}) });
            const res = await fetch(`${apiUrl}/runs/${runId}/evidence/sample?${qs.toString()}`);
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

    useEffect(() => {
        if (evidenceSections.length === 0) {
            console.warn("Evidence gating removed all sections; report may show only system banners.");
        }
    }, [evidenceSections.length]);

    const limitationFootnote = useMemo(() => {
        if (!hasTimeField) return "Time analysis suppressed: no date/time fields detected.";
        return null;
    }, [hasTimeField]);

    const sectionLimitations = (section: { title: string; content: string }) => {
        const notes: string[] = [];
        const lowerTitle = section.title.toLowerCase();
        const lowerContent = section.content.toLowerCase();
        if (safeMode) notes.push("Safe Mode: insights constrained");
        if (limitationsMode) notes.push("Limitations mode active");
        if (!hasTimeField && (lowerTitle.includes("time") || lowerContent.includes("forecast"))) {
            notes.push("Time/forecast suppressed (no date/time field)");
        }
        if (diagnostics?.validation?.failed_fields?.length) {
            notes.push(`Validation gaps: ${diagnostics.validation.failed_fields.slice(0, 3).join(", ")}`);
        }
        if (diagnostics?.identity?.missing_fields?.length) {
            notes.push(`Missing fields: ${diagnostics.identity.missing_fields.slice(0, 3).join(", ")}`);
        }
        return Array.from(new Set(notes));
    };

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
            icon: SECTION_ICONS.anomalies,
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
                        {renderInlineVisuals()}
                        {/* Highlights ribbon */}
                        <div className="mb-4 flex flex-wrap gap-2">
                            {highlights.map((chip, idx) => (
                                <Badge
                                    key={idx}
                                    variant={chip.tone === "warn" ? "destructive" : chip.tone === "ok" ? "outline" : "secondary"}
                                    className={chip.tone === "warn" ? "border-amber-500 bg-amber-50 text-amber-800" : undefined}
                                >
                                    {chip.label}
                                </Badge>
                            ))}
                        </div>
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
                                onClick={handleRunDiff}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                {diffLoading ? "Diffing..." : "Run Diff"}
                            </Button>
                            <input
                                className="h-9 rounded-md border px-2 text-sm bg-background"
                                placeholder="Compare run ID"
                                value={diffRunId}
                                onChange={(e) => setDiffRunId(e.target.value)}
                            />
                            <Button
                                onClick={handlePptxExport}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                {pptxLoading ? "Exporting..." : "PPTX"}
                            </Button>
                        </div>

                        {(diffError || diffData) && (
                            <Card className="mb-4 p-3">
                                <div className="text-sm font-semibold mb-1">Run Diff</div>
                                {diffError && <div className="text-xs text-red-600">{diffError}</div>}
                                {diffData && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div>Confidence delta: {diffData.confidence_delta ?? "n/a"}</div>
                                        <div>New segments: {(diffData.new_segments || []).length}</div>
                                        <div>Removed segments: {(diffData.removed_segments || []).length}</div>
                                        <div>New personas: {(diffData.new_personas || []).length}</div>
                                        <div>Evidence changes: {(diffData.evidence_changes || []).length}</div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {pptxError && (
                            <Card className="mb-4 p-3">
                                <div className="text-sm font-semibold text-red-700">PPTX Export</div>
                                <div className="text-xs text-red-700">{pptxError}</div>
                            </Card>
                        )}

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
                        {/* Insight story panels */}
                        {filteredSections.length > 0 && (
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">Narrative</div>
                                        <div className="text-sm font-semibold">Insight Storyboard</div>
                                    </div>
                                    <Badge variant="outline">Curated</Badge>
                                </div>
                                <div className="space-y-3">
                                    {filteredSections
                                        .slice(0, 6)
                                        .sort((a, b) => (a.title.toLowerCase().includes("insight") ? -1 : 1))
                                        .map((sec, idx) => {
                                        const limitationNotes = sectionLimitations(sec);
                                        return (
                                            <div key={idx} className="border rounded-md p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-semibold">{sec.title}</div>
                                                    <Badge variant="secondary">Confidence: {metrics.confidenceLevel ?? "n/a"}%</Badge>
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sec.content}</p>
                                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                    <Badge variant="outline">Evidence-linked</Badge>
                                                    {!hideActions && <Badge variant="outline">Actionable</Badge>}
                                                    {safeMode && <Badge variant="outline" className="border-amber-500 text-amber-700">Safe Mode</Badge>}
                                                </div>
                                                {limitationNotes.length > 0 && (
                                                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                                        {limitationNotes.map((note, nIdx) => (
                                                            <div key={nIdx}>Limitation: {note}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    <Button size="sm" variant="ghost" onClick={() => handleFetchEvidenceSample(sec.content, sec.id)}>
                                                        Inspect evidence
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

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
                                                onClick={() => handleFetchEvidenceSample(sec.content, sec.id)}
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

                        {/* Curated Actions (top 3) */}
                        {mondayActions.length > 0 && (
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">Actions</div>
                                        <div className="text-sm font-semibold">Impact x Confidence (Top 3)</div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setShowAllActions((v) => !v)}>
                                        {showAllActions ? "Hide full list" : "Expand full list"}
                                    </Button>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                    {mondayActions.slice(0, 3).map((a, idx) => (
                                        <div key={idx} className={cn("border rounded-md p-2 text-sm", hideActions && "opacity-60")}>
                                            <div className="font-semibold">{a.title || `Action ${idx + 1}`}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-2">{a.description || a}</div>
                                            <div className="mt-1 text-xs">Confidence: {a.confidence ?? metrics.confidenceLevel ?? "n/a"}%</div>
                                            {hideActions && <div className="text-xs text-amber-700">Hidden in strict mode</div>}
                                        </div>
                                    ))}
                                </div>
                                {showAllActions && mondayActions.length > 3 && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {mondayActions.slice(3).map((a, idx) => (
                                            <div key={idx} className="border rounded-md p-2 text-sm">
                                                <div className="font-semibold">{a.title || `Action ${idx + 4}`}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-2">{a.description || a}</div>
                                            </div>
                                        ))}
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

                        {/* Curated Personas */}
                        {measurableSegments.length > 0 && (
                            <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">Personas</div>
                                        <div className="text-sm font-semibold">Top Segments</div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setShowAllPersonas((v) => !v)}>
                                        {showAllPersonas ? "Hide all segments" : "See all segments"}
                                    </Button>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {measurableSegments.slice(0, 3).map((seg: any, idx: number) => (
                                        <Card key={idx} className="p-3">
                                            <div className="text-sm font-semibold">{seg.label || `Segment ${idx + 1}`}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {seg.subtitle || "Data-driven segment"}
                                            </div>
                                            {seg.count && (
                                                <div className="mt-1 text-xs text-muted-foreground">Size: {seg.count}</div>
                                            )}
                                            {seg.mean && (
                                                <div className="mt-1 text-xs text-muted-foreground">Mean: {Math.round(seg.mean)}</div>
                                            )}
                                            {seg.uplift && (
                                                <div className="mt-1 text-xs text-muted-foreground">Uplift: {Math.round(seg.uplift)}%</div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                                {showAllPersonas && measurableSegments.length > 3 && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {measurableSegments.slice(3).map((seg: any, idx: number) => (
                                            <div key={idx} className="border rounded-md p-2 text-sm">
                                                <div className="font-semibold">{seg.label || `Segment ${idx + 4}`}</div>
                                                <div className="text-xs text-muted-foreground">{seg.subtitle || "Segment"}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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

export default WideReportViewer;
