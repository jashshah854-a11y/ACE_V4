import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface CriticalIssue {
    severity: "critical" | "high";
    title: string;
    description: string;
    sectionId: string;
    count?: number;
}

interface CriticalIssuesBannerProps {
    issues: CriticalIssue[];
    onIssueClick?: (sectionId: string) => void;
}

export function CriticalIssuesBanner({
    issues,
    onIssueClick,
}: CriticalIssuesBannerProps) {
    if (issues.length === 0) return null;

    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const highCount = issues.length - criticalCount;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
        >
            <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                            <AlertTriangle className="h-5 w-5" />
                            Critical Issues Detected
                        </CardTitle>
                        <div className="flex gap-2">
                            {criticalCount > 0 && (
                                <Badge variant="destructive">
                                    {criticalCount} Critical
                                </Badge>
                            )}
                            {highCount > 0 && (
                                <Badge variant="outline" className="border-orange-500 text-orange-700">
                                    {highCount} High
                                </Badge>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                        The following issues require immediate attention
                    </p>
                </CardHeader>
                <CardContent className="space-y-2">
                    {issues.map((issue, index) => (
                        <motion.button
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => onIssueClick?.(issue.sectionId)}
                            className="w-full text-left p-3 rounded-lg bg-white dark:bg-red-950/20 border border-red-200 dark:border-red-800 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-start gap-3">
                                <AlertCircle
                                    className={
                                        issue.severity === "critical"
                                            ? "h-4 w-4 text-red-600 shrink-0 mt-0.5"
                                            : "h-4 w-4 text-orange-600 shrink-0 mt-0.5"
                                    }
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{issue.title}</span>
                                        {issue.count && (
                                            <span className="text-xs text-muted-foreground">
                                                ({issue.count.toLocaleString()})
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {issue.description}
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </CardContent>
            </Card>
        </motion.div>
    );
}

/**
 * Extract critical issues from report content
 */
export function extractCriticalIssues(content: string): CriticalIssue[] {
    const issues: CriticalIssue[] = [];

    // High anomaly count
    const anomalyMatch = content.match(/Total Anomalies.*?(\d+)/i);
    if (anomalyMatch) {
        const count = parseInt(anomalyMatch[1]);
        if (count > 500) {
            issues.push({
                severity: "critical",
                title: "Extremely high anomaly count",
                description: "Over 500 anomalous records detected. Manual review required.",
                sectionId: "anomaly-detection",
                count,
            });
        } else if (count > 200) {
            issues.push({
                severity: "high",
                title: "Elevated anomaly count",
                description: "Significant number of unusual records. Review recommended.",
                sectionId: "anomaly-detection",
                count,
            });
        }
    }

    // Poor cluster quality
    const silhouetteMatch = content.match(/Silhouette Score.*?([\d.]+)/i);
    if (silhouetteMatch) {
        const score = parseFloat(silhouetteMatch[1]);
        if (score < 0.2) {
            issues.push({
                severity: "critical",
                title: "Very poor cluster separation",
                description: "Clusters are poorly defined. Results may be unreliable.",
                sectionId: "behavioral-clusters",
            });
        }
    }

    // Low data quality
    const qualityMatch = content.match(/Data(?:set)? Quality Score.*?([\d.]+)/i);
    if (qualityMatch) {
        const quality = parseFloat(qualityMatch[1]);
        if (quality < 0.5) {
            issues.push({
                severity: "critical",
                title: "Low data quality detected",
                description: "Dataset has significant quality issues. Data cleaning recommended.",
                sectionId: "executive-summary",
            });
        } else if (quality < 0.7) {
            issues.push({
                severity: "high",
                title: "Data quality concerns",
                description: "Some data quality issues present. Review data sources.",
                sectionId: "executive-summary",
            });
        }
    }

    return issues;
}
