import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartData } from "@/lib/reportParser";

interface ReportChartsProps {
    segmentData: ChartData[];
    compositionData: ChartData[];
    qualityScore?: number;
    className?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export function ReportCharts({
    segmentData,
    compositionData,
    qualityScore,
    className,
}: ReportChartsProps) {
    const hasData = segmentData.length > 0 || compositionData.length > 0 || qualityScore !== undefined;

    if (!hasData) {
        return null;
    }

    return (
        <div className={className}>
            <h3 className="text-xl font-semibold mb-4">Visual Analytics</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Data Quality Gauge */}
                {qualityScore !== undefined && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Data Quality Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <QualityGauge score={qualityScore} />
                        </CardContent>
                    </Card>
                )}

                {/* Segment Analysis Bar Chart */}
                {segmentData.length > 0 && (
                    <Card className={compositionData.length === 0 ? "md:col-span-2" : ""}>
                        <CardHeader>
                            <CardTitle className="text-sm">Segment Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={segmentData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Composition Pie Chart */}
                {compositionData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Data Composition</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={compositionData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={60}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {compositionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

// Simple gauge visualization using SVG
function QualityGauge({ score }: { score: number }) {
    const normalizedScore = Math.min(100, Math.max(0, score));
    const rotation = (normalizedScore / 100) * 180 - 90; // -90 to 90 degrees

    const getColor = (score: number) => {
        if (score >= 90) return "#22c55e"; // green
        if (score >= 70) return "#eab308"; // yellow
        return "#ef4444"; // red
    };

    const color = getColor(normalizedScore);

    return (
        <div className="flex flex-col items-center">
            <svg width="200" height="120" viewBox="0 0 200 120">
                {/* Background arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    strokeLinecap="round"
                />
                {/* Score arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke={color}
                    strokeWidth="20"
                    strokeLinecap="round"
                    strokeDasharray={`${(normalizedScore / 100) * 251} 251`}
                />
                {/* Needle */}
                <line
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="30"
                    stroke={color}
                    strokeWidth="3"
                    transform={`rotate(${rotation} 100 100)`}
                />
                {/* Center dot */}
                <circle cx="100" cy="100" r="5" fill={color} />
            </svg>
            <div className="text-center mt-2">
                <div className="text-3xl font-bold" style={{ color }}>
                    {normalizedScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
        </div>
    );
}
