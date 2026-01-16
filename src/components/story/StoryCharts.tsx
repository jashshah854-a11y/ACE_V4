
import React from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { cn } from '@/lib/utils';

// --- Types ---
interface ChartDataPoint {
    label: string;
    value: number;
    [key: string]: any;
}

interface BaseChartProps {
    data: ChartDataPoint[];
    title?: string;
    className?: string;
    color?: string;
}

// --- Utilities ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-lg">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-lg font-bold font-mono text-foreground">
                    {typeof payload[0].value === 'number'
                        ? payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

// --- Components ---

/**
 * StoryBarChart
 * Clean, minimal bar chart for categorical data comparisons.
 */
export function StoryBarChart({ data, title, className, color = "#3b82f6" }: BaseChartProps) {
    return (
        <div className={cn("w-full h-full flex flex-col", className)}>
            {title && (
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
                    {title}
                </h4>
            )}
            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={color} opacity={0.8 + (index % 5) * 0.05} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

/**
 * StoryLineChart
 * Smooth line chart for trend analysis.
 */
export function StoryLineChart({ data, title, className, color = "#8b5cf6" }: BaseChartProps) {
    return (
        <div className={cn("w-full h-full flex flex-col", className)}>
            {title && (
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2">
                    {title}
                </h4>
            )}
            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            dy={10}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2 }} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            dot={{ r: 4, fill: 'hsl(var(--background))', stroke: color, strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: color }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
