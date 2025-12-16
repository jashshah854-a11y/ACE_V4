import { Card } from "@/components/ui/card";

interface ExecutiveSummaryProps {
    content?: string;
}

export function ExecutiveSummary({ content }: ExecutiveSummaryProps) {
    // Default executive summary if not provided
    const defaultSummary =
        "This report analyzes data quality and behavioral patterns to identify risks, anomalies, and improvement opportunities. The goal is to help teams focus attention where it matters most.";

    const summaryText = content || defaultSummary;

    return (
        <Card className="border-none bg-gradient-to-br from-blue-950/20 via-purple-950/20 to-blue-950/20 mb-8">
            <div className="p-8">
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
                    Executive Summary
                </h2>
                <p className="text-lg leading-relaxed text-foreground/90">
                    {summaryText}
                </p>
            </div>
        </Card>
    );
}

/**
 * Extract executive summary from report markdown
 */
export function extractExecutiveSummary(content: string): string | undefined {
    // Look for executive summary section
    const summaryMatch = content.match(/##?\s*Executive Summary\s*\n+(.*?)(?=\n##|\n\*\*|$)/is);
    if (summaryMatch) {
        return summaryMatch[1].trim();
    }

    // Fallback: use first paragraph before any headers
    const firstParaMatch = content.match(/^([^#\n]+)\n/);
    if (firstParaMatch && firstParaMatch[1].length > 50) {
        return firstParaMatch[1].trim();
    }

    return undefined;
}
