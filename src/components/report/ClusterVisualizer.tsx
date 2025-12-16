import { BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ClusterData {
    id: string;
    name: string;
    size: number;
    characteristics: { feature: string; value: number }[];
    color: string;
    summary?: string;
}

interface ClusterVisualizerProps {
    clusters: ClusterData[];
    className?: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function ClusterVisualizer({ clusters, className }: ClusterVisualizerProps) {
    if (!clusters || clusters.length === 0) {
        return null;
    }

    // Prepare data for pie chart (cluster sizes)
    const sizeData = clusters.map((cluster) => ({
        name: cluster.name,
        value: cluster.size,
        color: cluster.color || COLORS[clusters.indexOf(cluster) % COLORS.length],
    }));

    return (
        <div className={cn("space-y-6", className)}>
            {/* Cluster Size Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Cluster Size Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={sizeData}
                                cx="50%"
                                cy="50%"
                                label={(entry) => `${entry.name}: ${entry.value.toLocaleString()}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {sizeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {clusters.map((cluster, index) => (
                            <div
                                key={cluster.id}
                                className="flex items-center gap-2 p-2 rounded border"
                                style={{ borderLeft: `4px solid ${cluster.color || COLORS[index % COLORS.length]}` }}
                            >
                                <div>
                                    <div className="font-semibold text-sm">{cluster.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {cluster.size.toLocaleString()} customers
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Feature Comparison */}
            {clusters[0]?.characteristics && clusters[0].characteristics.length > 0 && (
                <ClusterFeatureComparison clusters={clusters} />
            )}

            {/* Individual Cluster Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {clusters.map((cluster, index) => (
                    <ClusterCard
                        key={cluster.id}
                        cluster={cluster}
                        color={cluster.color || COLORS[index % COLORS.length]}
                    />
                ))}
            </div>
        </div>
    );
}

function ClusterFeatureComparison({ clusters }: { clusters: ClusterData[] }) {
    // Prepare data for bar chart - compare first few features across clusters
    const features = clusters[0]?.characteristics.slice(0, 4) || [];

    const comparisonData = features.map((feat) => {
        const dataPoint: any = { feature: feat.feature };
        clusters.forEach((cluster) => {
            const value = cluster.characteristics.find((c) => c.feature === feat.feature)?.value || 0;
            dataPoint[cluster.name] = value;
        });
        return dataPoint;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Feature Comparison Across Clusters</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="feature" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {clusters.map((cluster, index) => (
                            <Bar
                                key={cluster.id}
                                dataKey={cluster.name}
                                fill={cluster.color || COLORS[index % COLORS.length]}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function ClusterCard({ cluster, color }: { cluster: ClusterData; color: string }) {
    return (
        <Card className="border-l-4" style={{ borderLeftColor: color }}>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                    {cluster.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <div className="text-sm text-muted-foreground">Size</div>
                    <div className="text-2xl font-bold">{cluster.size.toLocaleString()}</div>
                </div>

                {cluster.summary && (
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">Summary</div>
                        <p className="text-sm">{cluster.summary}</p>
                    </div>
                )}

                {cluster.characteristics && cluster.characteristics.length > 0 && (
                    <div>
                        <div className="text-sm text-muted-foreground mb-2">Key Characteristics</div>
                        <div className="space-y-2">
                            {cluster.characteristics.slice(0, 5).map((char) => (
                                <div key={char.feature} className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">{char.feature}</span>
                                    <span className="font-medium">{char.value.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
