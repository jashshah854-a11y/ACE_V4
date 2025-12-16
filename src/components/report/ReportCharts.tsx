import {
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell,
    BarChart as RechartsBar,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    RadialBarChart,
    RadialBar,
    PolarAngleAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from "@/lib/reportParser";

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

interface GaugeChartProps {
    value: number;
    max?: number;
    title: string;
    color?: string;
}

export function GaugeChart({ value, max = 100, title, color = "#6366f1" }: GaugeChartProps) {
    const data = [{ name: title, value, fill: color }];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="90%"
                        barSize={20}
                        data={data}
                        startAngle={180}
                        endAngle={0}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, max]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={10}
                        />
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-3xl font-bold"
                        >
                            {value}%
                        </text>
                    </RadialBarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface BarChartProps {
    data: ChartData[];
    title: string;
    xKey?: string;
    yKey?: string;
}

export function BarChartComponent({ data, title, xKey = "name", yKey = "value" }: BarChartProps) {
    if (!data || data.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBar data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey={xKey}
                            className="text-xs"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey={yKey} fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </RechartsBar>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface PieChartProps {
    data: ChartData[];
    title: string;
}

export function PieChartComponent({ data, title }: PieChartProps) {
    if (!data || data.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                    </RechartsPie>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface ReportChartsProps {
    qualityScore?: number;
    segmentData?: ChartData[];
    compositionData?: ChartData[];
}

/**
 * Collection of interactive Recharts visualizations for report
 */
export function ReportCharts({
    qualityScore,
    segmentData = [],
    compositionData = []
}: ReportChartsProps) {
    return (
        <div className="space-y-6">
            {/* Two-column layout for charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gauge Chart */}
                {qualityScore !== undefined && (
                    <GaugeChart
                        value={qualityScore}
                        title="Data Quality Score"
                        color={qualityScore >= 90 ? "#10b981" : qualityScore >= 70 ? "#f59e0b" : "#ef4444"}
                    />
                )}

                {/* Pie Chart */}
                {compositionData.length > 0 && (
                    <PieChartComponent
                        data={compositionData}
                        title="Data Composition"
                    />
                )}
            </div>

            {/* Full-width Bar Chart */}
            {segmentData.length > 0 && (
                <BarChartComponent
                    data={segmentData}
                    title="Segment Analysis"
                />
            )}
        </div>
    );
}
