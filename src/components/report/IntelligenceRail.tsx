import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Target,
    AlertTriangle,
    TrendingUp,
    BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface IntelligenceRailProps {
    keyTakeaways?: string[];
    criticalIssues?: {
        count: number;
        items: string[];
    };
    quickStats?: {
        dataQuality?: number;
        confidence?: number;
        anomalies?: number;
    };
    sections?: Array<{
        id: string;
        title: string;
    }>;
    currentSection?: string;
    readingProgress?: number;
    onSectionClick?: (sectionId: string) => void;
}

/**
 * Sticky right-side intelligence rail providing contextual information
 * while user reads the main report
 */
export function IntelligenceRail({
    keyTakeaways = [],
    criticalIssues,
    quickStats,
    sections = [],
    currentSection,
    readingProgress = 0,
    onSectionClick
}: IntelligenceRailProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setProgress(readingProgress);
    }, [readingProgress]);

    return (
        <div className="space-y-4">
            {/* Reading Progress */}
            {readingProgress > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Reading Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {Math.round(progress)}% complete
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Key Takeaways */}
            {keyTakeaways.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Key Takeaways
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {keyTakeaways.slice(0, 5).map((takeaway, idx) => (
                                <li key={idx} className="text-sm flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>{takeaway}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Critical Issues */}
            {criticalIssues && criticalIssues.count > 0 && (
                <Card className="border-orange-200 dark:border-orange-900">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            Critical Issues
                            <Badge variant="destructive" className="ml-auto">
                                {criticalIssues.count}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {criticalIssues.items.slice(0, 3).map((issue, idx) => (
                                <li key={idx} className="text-sm text-orange-700 dark:text-orange-400">
                                    {issue}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats */}
            {quickStats && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Quick Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {quickStats.dataQuality !== undefined && (
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span>Data Quality</span>
                                    <span className="font-medium">{quickStats.dataQuality}%</span>
                                </div>
                                <Progress value={quickStats.dataQuality} className="h-1.5" />
                            </div>
                        )}
                        {quickStats.confidence !== undefined && (
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span>Confidence</span>
                                    <span className="font-medium">{quickStats.confidence}%</span>
                                </div>
                                <Progress value={quickStats.confidence} className="h-1.5" />
                            </div>
                        )}
                        {quickStats.anomalies !== undefined && (
                            <div className="flex justify-between text-sm">
                                <span>Anomalies</span>
                                <Badge variant={quickStats.anomalies > 0 ? "destructive" : "secondary"}>
                                    {quickStats.anomalies}
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Section Navigation */}
            {sections.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Jump To Section
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => onSectionClick?.(section.id)}
                                    className={cn(
                                        "w-full text-left text-sm px-2 py-1.5 rounded transition-colors",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        currentSection === section.id && "bg-primary/10 text-primary font-medium"
                                    )}
                                >
                                    {section.title}
                                </button>
                            ))}
                        </nav>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
