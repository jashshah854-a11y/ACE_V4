import { ResponsiveContainer, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartWrapper } from "../ChartWrapper";
import { ExplanationBlock } from "../ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";

export interface TrendChartProps {
    data: Array<{
        date: string | number;
        value: number;
        label?: string;
    }>;
    title: string;
    metricName: string;
    dateRange?: string;
    sampleSize?: number;
    confidence?: number;
    insight?: string;
}

/**
 * TrendChart - Visualize how a metric changes over time
 */
export function TrendChart({
    data,
    title,
    metricName,
    dateRange,
    sampleSize,
    confidence,
    insight,
}: TrendChartProps) {
    const explanationCopy = getSectionCopy("trends", {
        metric_name: metricName,
        time_period: dateRange || "the available period",
        num_observations: sampleSize?.toString() || data.length.toString(),
        date_range: dateRange || "full dataset",
    });

    const chartContent = (
        <ResponsiveContainer width="100%" height={300}>
            <RechartsLine data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="value"
                    name={metricName}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                />
            </RechartsLine>
        </ResponsiveContainer>
    );

    return (
        <div className="space-y-4">
            <ExplanationBlock {...explanationCopy} />

            <ChartWrapper
                title={title}
                questionAnswered={`How has ${metricName} changed over time?`}
                source="Time series analysis"
                dateRange={dateRange}
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
                    [metricName]: "The metric being tracked over time",
                    "Trend": "Overall direction of movement (up, down, or flat)",
                }}
            />
        </div>
    );
}
