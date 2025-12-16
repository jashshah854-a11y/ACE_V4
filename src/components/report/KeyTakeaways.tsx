import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export interface Insight {
    severity: "critical" | "warning" | "info" | "success";
    title: string;
    description: string;
    sectionId: string;
    metric?: string;
}

interface KeyTakeawaysProps {
    insights: Insight[];
    onInsightClick?: (sectionId: string) => void;
}

export function KeyTakeaways({ insights, onInsightClick }: KeyTakeawaysProps) {
    if (insights.length === 0) return null;

    const severityConfig = {
        critical: {
            icon: AlertTriangle,
            color: "text-red-600",
            bgColor: "bg-red-50 dark:bg-red-950/20",
            borderColor: "border-red-200 dark:border-red-800",
            badge: "destructive" as const,
        },
        warning: {
            icon: AlertTriangle,
            color: "text-yellow-600",
            bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
            borderColor: "border-yellow-200 dark:border-yellow-800",
            badge: "outline" as const,
        },
        info: {
            icon: Info,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950/20",
            borderColor: "border-blue-200 dark:border-blue-800",
            badge: "secondary" as const,
        },
        success: {
            icon: CheckCircle,
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950/20",
            borderColor: "border-green-200 dark:border-green-800",
            badge: "outline" as const,
        },
    };

    return (
        <Card className="border-l-4 border-l-blue-500 mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Key Takeaways
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    AI-generated insights from this analysis
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {insights.map((insight, i) => {
                    const config = severityConfig[insight.severity];
                    const Icon = config.icon;

                    return (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => onInsightClick?.(insight.sectionId)}
                            className={`w-full text-left p-4 rounded-lg border ${config.borderColor} ${config.bgColor} hover:shadow-md transition-all cursor-pointer group`}
                        >
                            <div className="flex items-start gap-3">
                                <Icon className={`h-5 w-5 ${config.color} shrink-0 mt-0.5`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                                        <Badge variant={config.badge} className="text-xs">
                                            {insight.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {insight.description}
                                    </p>
                                    {insight.metric && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {insight.metric}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </CardContent>
        </Card>
    );
}

/**
 * Extract key insights from report markdown
 */
export function extractKeyInsights(content: string): Insight[] {
    const insights: Insight[] = [];

    // Critical: High anomaly count
    const anomalyMatch = content.match(/Total Anomalies.*?(\d+)/i);
    if (anomalyMatch) {
        const count = parseInt(anomalyMatch[1]);
        if (count > 100) {
            insights.push({
                severity: "critical",
                title: `${count.toLocaleString()} anomalies detected`,
                description: "High number of unusual records requiring immediate review",
                sectionId: "anomaly-detection",
                metric: `${((count / 10000) * 100).toFixed(1)}% of total records`,
            });
        } else if (count > 0) {
            insights.push({
                severity: "info",
                title: `${count} anomalies detected`,
                description: "Small number of unusual records flagged for review",
                sectionId: "anomaly-detection",
            });
        }
    }

    // Warning: Low cluster quality
    const silhouetteMatch = content.match(/Silhouette Score.*?([\d.]+)/i);
    if (silhouetteMatch) {
        const score = parseFloat(silhouetteMatch[1]);
        if (score < 0.3) {
            insights.push({
                severity: "warning",
                title: "Cluster quality below threshold",
                description: "Clusters may overlap. Consider re-running with different parameters",
                sectionId: "behavioral-clusters",
                metric: `Silhouette Score: ${score.toFixed(2)}`,
            });
        } else if (score > 0.7) {
            insights.push({
                severity: "success",
                title: "Excellent cluster separation",
                description: "Clear, well-defined customer segments identified",
                sectionId: "behavioral-clusters",
                metric: `Silhouette Score: ${score.toFixed(2)}`,
            });
        }
    }

    // Info: Data quality score
    const qualityMatch = content.match(/Data(?:set)? Quality Score.*?([\d.]+)/i);
    if (qualityMatch) {
        const quality = parseFloat(qualityMatch[1]);
        if (quality >= 0.9) {
            insights.push({
                severity: "success",
                title: "High data quality",
                description: "Dataset is clean and ready for analysis",
                sectionId: "executive-summary",
                metric: `Quality: ${(quality * 100).toFixed(0)}%`,
            });
        } else if (quality < 0.7) {
            insights.push({
                severity: "warning",
                title: "Data quality concerns",
                description: "Some data cleaning may improve results",
                sectionId: "executive-summary",
                metric: `Quality: ${(quality * 100).toFixed(0)}%`,
            });
        }
    }

    // Info: Number of clusters found
    const clusterCountMatch = content.match(/Optimal Clusters.*?(\d+)/i);
    if (clusterCountMatch) {
        const count = parseInt(clusterCountMatch[1]);
        insights.push({
            severity: "info",
            title: `${count} distinct customer segments identified`,
            description: "Use these segments for targeted strategies",
            sectionId: "behavioral-clusters",
        });
    }

    return insights;
}
