import { ResponsiveContainer, BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartWrapper } from "../ChartWrapper";
import { ExplanationBlock } from "../ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";

export interface DistributionChartProps {
    data: Array<{ bin: string; count: number }>;
    title: string;
    variableName: string;
    sampleSize?: number;
    confidence?: number;
    insight?: string;
}

/**
 * DistributionChart - Show how values are spread across ranges
 */
export function DistributionChart({
    data,
    title,
    variableName,
    sampleSize,
    confidence,
    insight,
}: DistributionChartProps) {
    const explanationCopy = getSectionCopy("distribution", {
        variable_name: variableName,
    });

    const chartContent = (
        <ResponsiveContainer width="100%" height={300}>
            <RechartsBar data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bin" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
            </RechartsBar>
        </ResponsiveContainer>
    );

    return (
        <div className="space-y-4">
            <ExplanationBlock {...explanationCopy} />

            <ChartWrapper
                title={title}
                questionAnswered={`How are ${variableName} values distributed?`}
                source="Distribution analysis"
                sampleSize={sampleSize}
                confidence={confidence}
                chart={chartContent}
                caption={
                    insight
                        ? {
                            text: insight,
                            severity: "neutral",
                        }
                        : undefined
                }
                metricDefinitions={{
                    "Bin": "Value range grouping",
                    "Count": "Number of records in this range",
                    [variableName]: "The variable being analyzed",
                }}
            />
        </div>
    );
}
