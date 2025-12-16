import { useState } from "react";
import { ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PipelineConcept {
    term: string;
    simple: string;
    detailed: string;
    whenToUse?: string;
}

const PIPELINE_CONCEPTS: PipelineConcept[] = [
    {
        term: "Behavioral Clustering",
        simple: "Groups similar customers together based on their behavior patterns.",
        detailed:
            "Uses machine learning to automatically discover groups of customers who behave similarly. Each cluster represents a distinct customer segment with unique characteristics.",
        whenToUse: "Use clusters to create targeted marketing campaigns or personalized experiences for each group.",
    },
    {
        term: "Silhouette Score",
        simple: "Measures how well-defined the customer groups are.",
        detailed:
            "Ranges from -1 to 1. Scores above 0.5 indicate clear, well-separated groups. Scores below 0.3 suggest groups may overlap or be poorly defined.",
        whenToUse: "A high score means you can confidently treat each cluster as a distinct segment.",
    },
    {
        term: "Earth Hypothesis",
        simple: "Tests if discovered patterns are real or just random noise.",
        detailed:
            "Compares actual data patterns against randomized versions. If patterns persist when data is shuffled, they're likely noise rather than genuine insights.",
        whenToUse: "Validates that clusters represent true behavioral differences, not statistical artifacts.",
    },
    {
        term: "Outcome Modeling",
        simple: "Predicts future outcomes using machine learning.",
        detailed:
            "Builds predictive models to forecast outcomes (e.g., purchases, churn). The R² score shows how well the model works: 1.0 is perfect, 0.0 means no predictive power.",
        whenToUse: "Identify which factors most influence outcomes so you can focus on what matters.",
    },
    {
        term: "Anomaly Detection",
        simple: "Flags unusual records that don't fit normal patterns.",
        detailed:
            "Automatically identifies data points that deviate significantly from typical behavior. Could indicate fraud, errors, or unique opportunities.",
        whenToUse: "Review flagged anomalies for data quality issues or exceptional cases requiring attention.",
    },
    {
        term: "Personas",
        simple: "Creates fictional customer profiles representing each segment.",
        detailed:
            "Generates human-readable character sketches based on cluster characteristics. Makes abstract data patterns relatable and actionable for teams.",
        whenToUse: "Share personas with marketing, product, and sales teams to align everyone on who customers are.",
    },
];

export function PipelineExplainer() {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    return (
        <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    Understanding the Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {PIPELINE_CONCEPTS.map((concept, index) => (
                    <div key={concept.term} className="border rounded-lg">
                        <button
                            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {expandedIndex === index ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-semibold text-sm">{concept.term}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Click to learn more</span>
                        </button>

                        {expandedIndex === index && (
                            <div className="px-3 pb-3 space-y-3 border-t pt-3 bg-muted/30">
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-1">What it is:</p>
                                    <p className="text-sm text-muted-foreground">{concept.simple}</p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-foreground mb-1">How it works:</p>
                                    <p className="text-sm text-muted-foreground">{concept.detailed}</p>
                                </div>

                                {concept.whenToUse && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                            When to use:
                                        </p>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">{concept.whenToUse}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
