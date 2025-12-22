import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PDFExporter, downloadMarkdown, copyToClipboard } from "./PDFExporter";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ReportSkeleton } from "./ReportSkeleton";
import { ExecutiveReportLayout } from "./ExecutiveReportLayout";
import { MetricCardRow } from "./consultant/MetricCardRow";
import { AllocationChart } from "./consultant/AllocationChart";
import { ExecutiveNarrative } from "./consultant/ExecutiveNarrative";
import { DataTable } from "./consultant/DataTable";
import { InteractiveLineChart } from "./consultant/charts/InteractiveLineChart";
import { IntelligenceRail } from "./IntelligenceRail";
import {
  transformToMetricCards,
  transformToAllocationData,
  transformToTrendData,
  transformToTableData,
  extractNarrativeContent,
  hasVisualizableData
} from "@/lib/reportDataTransformer";
import { extractMetrics, extractSections } from "@/lib/reportParser";
import { extractHeroInsight, generateMondayActions, extractSegmentData } from "@/lib/insightExtractors";
import { extractAnomalies } from "@/lib/reportParser";
import { HeroInsightPanel } from "./HeroInsightPanel";
import { MondayMorningActions } from "./MondayMorningActions";

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
  const { toast } = useToast();

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

  // Transform data using the new transformer
  const metricCards = transformToMetricCards(content);
  const allocationData = transformToAllocationData(content);
  const trendData = transformToTrendData(content);
  const tableData = transformToTableData(content);
  const narrativeContent = extractNarrativeContent(content);
  const dataAvailability = hasVisualizableData(content);

  // Extract metrics for hero insight
  const metrics = extractMetrics(content);
  const sections = extractSections(content);
  const anomalies = extractAnomalies(content);
  const heroInsight = extractHeroInsight(content, metrics);
  const mondayActions = generateMondayActions(content, metrics, anomalies);

  // Key takeaways for intelligence rail
  const keyTakeaways = content
    .split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 20 && line.length < 150)
    .slice(0, 5);

  // Build sections for navigation
  const navSections = [
    { id: "overview", label: "Overview" },
    ...(metricCards ? [{ id: "metrics", label: "Key Metrics" }] : []),
    ...(allocationData ? [{ id: "segments", label: "Segment Analysis" }] : []),
    ...(trendData ? [{ id: "trends", label: "Performance Trends" }] : []),
    ...(tableData ? [{ id: "details", label: "Detailed Breakdown" }] : []),
  ];

  // Table columns configuration
  const tableColumns = [
    { key: "segment" as const, header: "Segment", sortable: true },
    { key: "size" as const, header: "Size", align: "right" as const, sortable: true },
    { key: "percentage" as const, header: "Share", align: "right" as const },
    { key: "avgValue" as const, header: "Avg. Value", align: "right" as const, sortable: true },
    { key: "status" as const, header: "Status", align: "center" as const },
    { key: "action" as const, header: "Action", align: "center" as const },
  ];

  const handleExportPDF = () => {
    // Trigger PDF export
    const pdfButton = document.querySelector('[data-pdf-export]') as HTMLButtonElement;
    if (pdfButton) pdfButton.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const success = await copyToClipboard(content);
    if (success) {
      toast({
        title: "Copied to clipboard",
        description: "Report content ready to share"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("w-full", className)}
    >
      <ExecutiveReportLayout
        title="Analysis Report"
        subtitle={runId ? `Run ID: ${runId}` : undefined}
        sections={navSections}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        onShare={handleShare}
        rightRail={
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
            readingProgress={0}
          />
        }
      >
        <div className="space-y-12">
          {/* Section: Overview */}
          <section id="overview" className="scroll-mt-24">
            <HeroInsightPanel {...heroInsight} />
            
            {mondayActions.length > 0 && (
              <MondayMorningActions actions={mondayActions} className="mt-8" />
            )}

            {narrativeContent && (
              <ExecutiveNarrative
                headline={narrativeContent.headline}
                summary={narrativeContent.summary}
                keyPoints={narrativeContent.keyPoints}
                className="mt-8"
              />
            )}
          </section>

          {/* Section: Key Metrics */}
          {metricCards && (
            <section id="metrics" className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-bold text-navy-900 mb-6">Key Metrics</h2>
              <MetricCardRow metrics={metricCards} />
            </section>
          )}

          {/* Section: Segment Analysis */}
          {allocationData && (
            <section id="segments" className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-bold text-navy-900 mb-6">Segment Analysis</h2>
              <AllocationChart
                data={allocationData.chartData}
                totalRecords={allocationData.totalRecords}
                insights={allocationData.insights}
              />
            </section>
          )}

          {/* Section: Performance Trends */}
          {trendData && (
            <section id="trends" className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-bold text-navy-900 mb-6">Performance Trends</h2>
              <InteractiveLineChart
                data={trendData}
                title="Monthly Performance"
                subtitle="Current period vs. prior comparison"
                showForecast={true}
                showComparisonToggle={true}
              />
            </section>
          )}

          {/* Section: Detailed Breakdown */}
          {tableData && tableData.length > 0 && (
            <section id="details" className="scroll-mt-24">
              <h2 className="font-serif text-2xl font-bold text-navy-900 mb-6">Detailed Breakdown</h2>
              <DataTable
                title="Segment Performance Overview"
                columns={tableColumns}
                data={tableData}
              />
            </section>
          )}
        </div>

        {/* Hidden PDF exporter */}
        <div className="hidden">
          <PDFExporter
            contentId="report-content"
            filename={runId ? `ace-report-${runId}.pdf` : "ace-report.pdf"}
          />
        </div>
      </ExecutiveReportLayout>
    </motion.div>
  );
}
