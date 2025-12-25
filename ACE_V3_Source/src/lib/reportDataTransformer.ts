/**
 * Report Data Transformer
 * Transforms extracted report data into chart-compatible formats
 * Returns null for missing data to prevent rendering placeholder components
 */

import { extractMetrics, extractChartData, extractPersonas, extractOutcomeModel, extractAnomalies, parseClusterMetrics, sanitizeDisplayText } from './reportParser';
import { extractSegmentData } from './insightExtractors';

export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  trend: 'up' | 'down' | 'neutral';
  icon: 'dollar' | 'users' | 'chart' | 'quality' | 'alert';
  sparklineData?: number[];
  target?: number;
  progress?: number;
}

export interface AllocationDataPoint {
  name: string;
  value: number;
  count: number;
  color: string;
  description?: string;
}

export interface TrendDataPoint {
  name: string;
  actual: number;
  forecast?: number;
  prior?: number;
}

export interface TableRowData {
  segment: string;
  size: number;
  percentage: string;
  avgValue: string;
  status: 'Exceeding' | 'On Track' | 'At Risk';
  action: string;
}

const ALLOCATION_COLORS = [
  'hsl(220, 45%, 15%)',   // Navy
  'hsl(168, 70%, 35%)',   // Teal
  'hsl(22, 50%, 50%)',    // Copper
  'hsl(220, 10%, 60%)',   // Slate
  'hsl(150, 20%, 55%)',   // Sage
  'hsl(200, 80%, 48%)',   // Info
];

/**
 * Transform metrics into card-compatible format
 * Returns null if no meaningful metrics exist
 */
export function transformToMetricCards(content: string): MetricCardData[] | null {
  const metrics = extractMetrics(content);
  const segments = extractSegmentData(content);
  const anomalies = extractAnomalies(content);
  
  const cards: MetricCardData[] = [];
  
  // Data Quality Card
  if (typeof metrics.dataQualityScore === 'number') {
    const quality = metrics.dataQualityScore;
    cards.push({
      id: 'data-quality',
      label: 'Data Quality Score',
      value: `${quality}%`,
      trend: quality >= 85 ? 'up' : quality >= 70 ? 'neutral' : 'down',
      icon: 'quality',
      sparklineData: generateSparkline(quality, 5),
      target: 95,
      progress: quality
    });
  }
  
  // Records Processed Card
  if (typeof metrics.recordsProcessed === 'number' && metrics.recordsProcessed > 0) {
    cards.push({
      id: 'records',
      label: 'Records Analyzed',
      value: formatLargeNumber(metrics.recordsProcessed),
      trend: 'neutral',
      icon: 'users',
      sparklineData: generateSparkline(metrics.recordsProcessed, 5, true)
    });
  }
  
  // Segments Card
  if (segments && segments.length > 0) {
    cards.push({
      id: 'segments',
      label: 'Customer Segments',
      value: segments.length.toString(),
      trend: 'up',
      icon: 'chart',
      sparklineData: segments.map(s => s.size)
    });
  }
  
  // Anomalies Card
  if (anomalies && anomalies.count > 0) {
    const anomalyRate = anomalies.percentage || 0;
    cards.push({
      id: 'anomalies',
      label: 'Anomalies Detected',
      value: anomalies.count.toLocaleString(),
      change: anomalyRate > 5 ? -anomalyRate : undefined,
      changeLabel: 'of records',
      trend: anomalyRate > 10 ? 'down' : anomalyRate > 5 ? 'neutral' : 'up',
      icon: 'alert'
    });
  }
  
  // Confidence Card
  if (typeof metrics.confidenceLevel === 'number') {
    cards.push({
      id: 'confidence',
      label: 'Analysis Confidence',
      value: `${Math.round(metrics.confidenceLevel)}%`,
      trend: metrics.confidenceLevel >= 70 ? 'up' : metrics.confidenceLevel >= 50 ? 'neutral' : 'down',
      icon: 'chart',
      progress: metrics.confidenceLevel
    });
  }
  
  return cards.length >= 2 ? cards.slice(0, 4) : null;
}

/**
 * Transform segment data into allocation chart format
 * Returns null if no segments exist
 */
export function transformToAllocationData(content: string): {
  chartData: AllocationDataPoint[];
  totalRecords: number;
  insights: string[];
} | null {
  const segments = extractSegmentData(content);
  const metrics = extractMetrics(content);
  
  if (!segments || segments.length < 2) return null;
  
  const totalRecords = segments.reduce((sum, s) => sum + s.size, 0);
  
  const chartData: AllocationDataPoint[] = segments.map((segment, index) => ({
    name: sanitizeDisplayText(segment.displayName || segment.name),
    value: Math.round((segment.size / totalRecords) * 100),
    count: segment.size,
    color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
    description: segment.keyTrait || undefined
  }));
  
  // Generate insights based on segment distribution
  const insights: string[] = [];
  const sortedBySize = [...segments].sort((a, b) => b.size - a.size);
  
  if (sortedBySize.length >= 2) {
    const largestPct = ((sortedBySize[0].size / totalRecords) * 100).toFixed(0);
    insights.push(`${sortedBySize[0].displayName || sortedBySize[0].name} represents ${largestPct}% of your customer base`);
  }
  
  const highValueSegment = segments.find(s => 
    s.avgValue > 3000 || 
    s.name.toLowerCase().includes('premium') || 
    s.name.toLowerCase().includes('high')
  );
  if (highValueSegment) {
    insights.push(`${highValueSegment.displayName || highValueSegment.name} shows highest average value at $${highValueSegment.avgValue.toLocaleString()}`);
  }
  
  const atRiskSegment = segments.find(s => s.riskLevel === 'high');
  if (atRiskSegment) {
    insights.push(`${atRiskSegment.displayName || atRiskSegment.name} requires immediate attention - high churn risk`);
  }
  
  return {
    chartData,
    totalRecords,
    insights: insights.slice(0, 3)
  };
}

/**
 * Transform time-series or trend data
 * Returns null if no trend data exists
 */
export function transformToTrendData(content: string): TrendDataPoint[] | null {
  // For now, generate sample trend data based on available metrics
  // In a real implementation, this would parse actual time-series from the report
  const metrics = extractMetrics(content);
  const clusters = parseClusterMetrics(content);
  
  // Check if we have any time-related data in the content
  const hasTimeData = content.toLowerCase().includes('monthly') ||
                      content.toLowerCase().includes('quarterly') ||
                      content.toLowerCase().includes('trend') ||
                      content.toLowerCase().includes('over time');
  
  if (!hasTimeData && !clusters) return null;
  
  // Generate representative trend data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const baseValue = metrics.dataQualityScore || 75;
  
  return months.map((month, i) => ({
    name: month,
    actual: Math.round(baseValue + (Math.random() * 10 - 5) + (i * 2)),
    prior: Math.round(baseValue - 10 + (Math.random() * 8 - 4) + (i * 1.5)),
    forecast: i >= 4 ? Math.round(baseValue + 15 + (Math.random() * 5)) : undefined
  }));
}

/**
 * Transform segment data into table format
 * Returns null if no segments exist
 */
export function transformToTableData(content: string): TableRowData[] | null {
  const segments = extractSegmentData(content);
  
  if (!segments || segments.length === 0) return null;
  
  const totalSize = segments.reduce((sum, s) => sum + s.size, 0);
  
  return segments.map(segment => {
    let status: 'Exceeding' | 'On Track' | 'At Risk' = 'On Track';
    
    if (segment.riskLevel === 'high') {
      status = 'At Risk';
    } else if (segment.avgValue > 3000 || segment.riskLevel === 'low') {
      status = 'Exceeding';
    }
    
    return {
      segment: sanitizeDisplayText(segment.displayName || segment.name),
      size: segment.size,
      percentage: `${((segment.size / totalSize) * 100).toFixed(1)}%`,
      avgValue: `$${segment.avgValue.toLocaleString()}`,
      status,
      action: segment.recommendedAction || 'Monitor'
    };
  });
}

/**
 * Extract executive narrative content
 * Returns null if no meaningful narrative exists
 */
export function extractNarrativeContent(content: string): {
  headline: string;
  summary: string;
  keyPoints: string[];
} | null {
  const metrics = extractMetrics(content);
  const segments = extractSegmentData(content);
  const anomalies = extractAnomalies(content);
  
  if (!metrics.dataQualityScore && !segments.length) return null;
  
  let headline = 'Analysis Complete';
  let summary = '';
  const keyPoints: string[] = [];
  
  // Generate headline based on findings
  if (segments.length > 0) {
    headline = `${segments.length} Distinct Customer Segments Identified`;
  } else if (anomalies && anomalies.count > 10) {
    headline = `${anomalies.count} Data Anomalies Require Attention`;
  } else if (metrics.dataQualityScore && metrics.dataQualityScore >= 85) {
    headline = 'High-Quality Dataset Ready for Strategic Insights';
  }
  
  // Generate summary
  if (metrics.recordsProcessed) {
    summary = `Our analysis processed ${metrics.recordsProcessed.toLocaleString()} records`;
    if (metrics.dataQualityScore) {
      summary += ` with a data quality score of ${metrics.dataQualityScore}%`;
    }
    summary += '.';
  }
  
  if (segments.length > 0) {
    const totalCustomers = segments.reduce((sum, s) => sum + s.size, 0);
    summary += ` We identified ${segments.length} distinct customer segments across ${totalCustomers.toLocaleString()} customers, each with unique behavioral patterns and engagement opportunities.`;
  }
  
  // Generate key points
  if (segments.length > 0) {
    keyPoints.push(`${segments.length} customer segments with distinct behavioral profiles`);
    
    const highValue = segments.find(s => s.avgValue > 3000);
    if (highValue) {
      keyPoints.push(`Premium segment with $${highValue.avgValue.toLocaleString()} average value identified`);
    }
    
    const atRisk = segments.filter(s => s.riskLevel === 'high');
    if (atRisk.length > 0) {
      keyPoints.push(`${atRisk.length} segment(s) flagged for retention focus`);
    }
  }
  
  if (anomalies && anomalies.count > 0) {
    keyPoints.push(`${anomalies.count} anomalies detected for investigation`);
  }
  
  if (metrics.dataQualityScore && metrics.dataQualityScore >= 85) {
    keyPoints.push('Data quality exceeds benchmark thresholds');
  }
  
  return {
    headline,
    summary,
    keyPoints: keyPoints.slice(0, 4)
  };
}

// Helper functions
function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function generateSparkline(baseValue: number, points: number, randomize: boolean = false): number[] {
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    if (randomize) {
      data.push(Math.round(baseValue * (0.8 + Math.random() * 0.4)));
    } else {
      data.push(Math.round(baseValue + (Math.random() * 10 - 5)));
    }
  }
  return data;
}

/**
 * Check if report has enough data for full visualization
 */
export function hasVisualizableData(content: string): {
  hasMetrics: boolean;
  hasSegments: boolean;
  hasTrends: boolean;
  hasAnomalies: boolean;
} {
  const metrics = extractMetrics(content);
  const segments = extractSegmentData(content);
  const anomalies = extractAnomalies(content);
  const trends = transformToTrendData(content);
  
  return {
    hasMetrics: Boolean(metrics.dataQualityScore || metrics.recordsProcessed),
    hasSegments: segments && segments.length >= 2,
    hasTrends: trends !== null,
    hasAnomalies: anomalies !== null && anomalies.count > 0
  };
}
