import { ResponsiveContainer, ScatterChart as RechartsScatter, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { ChartWrapper } from "../ChartWrapper";
import { ExplanationBlock } from "../ExplanationBlock";
import { getSectionCopy } from "@/lib/reportCopy";

export interface ClusterPoint {
    x: number;
    y: number;
    cluster: number;
    label?: string;
}

export interface ClusterChartProps {
    data: ClusterPoint[];
    title: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    sampleSize?: number;
    confidence?: number;
    insight?: string;
    clusterLabels?: Record<number, string>;
}

const CLUSTER_COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
];

/**
 * ClusterChart - Visualize naturally occurring groups
 */
export function ClusterChart({
    data,
    title,
    xAxisLabel = "Dimension 1",
    yAxisLabel = "Dimension 2",
    sampleSize,
    confidence,
    insight,
    clusterLabels = {},
}: ClusterChartProps) {
    const numClusters = new Set(data.map((d) => d.cluster)).size;

    const explanationCopy = getSectionCopy("segments", {
        clustering_method: "K-means clustering",
        num_features: "multiple behavioral and attribute features",
    });

    const chartContent = (
        <ResponsiveContainer width="100%" height={350}>
            <RechartsScatter>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name={xAxisLabel} tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="y" name={yAxisLabel} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Legend />

                {Array.from({ length: numClusters }, (_, i) => {
                    const clusterData = data.filter((d) => d.cluster === i);
                    return (
                        <Scatter
                            key={i}
                            name={clusterLabels[i] || `Cluster ${i + 1}`}
                            data={clusterData}
                            fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                        />
                    );
                })}
            </RechartsScatter>
        </ResponsiveContainer>
    );

    return (
        <div className="space-y-4">
            <ExplanationBlock {...explanationCopy} />

            <ChartWrapper
                title={title}
                questionAnswered="Which distinct groups exist in the data?"
                source="Cluster analysis"
                sampleSize={sampleSize}
                confidence={confidence}
                chart={chartContent}
                caption={
                    insight
                        ? {
                            text: insight,
                            severity: "positive",
                        }
                        : undefined
                }
                metricDefinitions={{
                    "Cluster": "A group of similar records based on behavioral patterns",
                    [xAxisLabel]: "First principal dimension showing variation",
                    [yAxisLabel]: "Second principal dimension showing variation",
                }}
            />
        </div>
    );
}
