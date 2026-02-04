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

interface TooltipPayload {
    value: number;
    name: string;
    payload: { date: string | number; value: number; label?: string };
}

const CustomTooltip = ({
    active,
    payload,
    metricName
}: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
    metricName: string;
}) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg">
                <p className="text-sm font-medium text-foreground">{data.payload.date}</p>
                {data.payload.label && (
                    <p className="text-xs text-muted-foreground">{data.payload.label}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                    {metricName}: <span className="font-semibold text-foreground">{data.value.toLocaleString()}</span>
                </p>
            </div>
        );
    }
    return null;
};

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
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-foreground" />
                <Tooltip content={<CustomTooltip metricName={metricName} />} />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="value"
                    name={metricName}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, className: "fill-primary" }}
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
