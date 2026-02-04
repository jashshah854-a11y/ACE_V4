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

interface TooltipPayload {
    value: number;
    payload: { bin: string; count: number };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg">
                <p className="text-sm font-medium text-foreground">{data.payload.bin}</p>
                <p className="text-sm text-muted-foreground">
                    Count: <span className="font-semibold text-foreground">{data.value.toLocaleString()}</span>
                </p>
            </div>
        );
    }
    return null;
};

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
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="bin" tick={{ fontSize: 12 }} className="text-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-foreground" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
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
