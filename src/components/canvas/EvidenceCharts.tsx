import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessPulseMetrics {
    total_value?: number;
    avg_value?: number;
    median_value?: number;
    top_10_percent_value?: number;
    value_concentration?: number; // Gini coefficient
    high_value_count?: number;
    at_risk_count?: number;
    at_risk_percentage?: number;
}

interface BusinessPulseChartProps {
    metrics: BusinessPulseMetrics;
    className?: string;
}

/**
 * Business Pulse Chart
 * 
 * High-density metrics visualization following subtractive design:
 * - No gridlines
 * - No shadows
 * - No 3D effects
 * - Maximum data-ink ratio
 */
export function BusinessPulseChart({ metrics, className }: BusinessPulseChartProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {/* Value Metrics */}
            <div className="grid grid-cols-2 gap-3">
                <MetricCard
                    icon={DollarSign}
                    label="Total Value"
                    value={`$${(metrics.total_value || 0).toLocaleString()}`}
                    color="text-green-400"
                />
                <MetricCard
                    icon={TrendingUp}
                    label="Avg Value"
                    value={`$${(metrics.avg_value || 0).toLocaleString()}`}
                    color="text-blue-400"
                />
                <MetricCard
                    icon={Users}
                    label="High-Value"
                    value={(metrics.high_value_count || 0).toLocaleString()}
                    color="text-purple-400"
                />
                <MetricCard
                    icon={AlertCircle}
                    label="At Risk"
                    value={`${(metrics.at_risk_percentage || 0).toFixed(1)}%`}
                    color="text-yellow-400"
                />
            </div>

            {/* Gini Coefficient (Value Concentration) */}
            {metrics.value_concentration !== undefined && (
                <div className="p-3 bg-black/40 border border-lab-text/20 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-lab-text/60 uppercase tracking-wide">
                            Value Concentration (Gini)
                        </span>
                        <span className="text-sm font-semibold text-lab-accent">
                            {metrics.value_concentration.toFixed(3)}
                        </span>
                    </div>
                    <div className="h-2 bg-lab-text/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-500"
                            style={{ width: `${metrics.value_concentration * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-lab-text/40 mt-1">
                        {metrics.value_concentration > 0.5
                            ? 'High concentration (few customers drive most value)'
                            : 'Distributed value across customer base'}
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
}

function MetricCard({ icon: Icon, label, value, color }: MetricCardProps) {
    return (
        <div className="p-3 bg-black/40 border border-lab-text/20 rounded hover:border-lab-accent/40 transition-colors">
            <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("w-3 h-3", color)} />
                <span className="text-xs text-lab-text/60 uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p className={cn("text-lg font-semibold font-data", color)}>
                {value}
            </p>
        </div>
    );
}

/**
 * Predictive Drivers Chart
 * 
 * Horizontal bar chart with confidence intervals (P10-P90 fan charts)
 * Following subtractive design principles
 */
interface PredictiveDriver {
    feature: string;
    importance: number;
    p10?: number;  // 10th percentile (lower bound)
    p90?: number;  // 90th percentile (upper bound)
}

interface PredictiveDriversChartProps {
    drivers: PredictiveDriver[];
    className?: string;
}

export function PredictiveDriversChart({ drivers, className }: PredictiveDriversChartProps) {
    // Sort by importance descending
    const sortedDrivers = [...drivers].sort((a, b) => b.importance - a.importance);

    // Take top 10 for readability
    const topDrivers = sortedDrivers.slice(0, 10);

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-lab-accent uppercase tracking-wide">
                    Feature Importance
                </h4>
                <span className="text-xs text-lab-text/40">
                    Top {topDrivers.length} drivers
                </span>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="space-y-2">
                {topDrivers.map((driver, index) => (
                    <DriverBar key={driver.feature} driver={driver} rank={index + 1} />
                ))}
            </div>

            {/* Recharts Alternative (if needed for more complex visualizations) */}
            {/* <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={topDrivers} 
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="feature" hide />
          <Bar dataKey="importance" fill="#22d3ee" radius={[0, 4, 4, 0]}>
            {topDrivers.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`hsl(${180 + index * 10}, 70%, 50%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer> */}
        </div>
    );
}

/**
 * Driver Bar Component
 * Custom horizontal bar with confidence interval fan
 */
interface DriverBarProps {
    driver: PredictiveDriver;
    rank: number;
}

function DriverBar({ driver, rank }: DriverBarProps) {
    const hasConfidenceInterval = driver.p10 !== undefined && driver.p90 !== undefined;

    // Color gradient based on rank
    const getColor = (rank: number) => {
        if (rank <= 3) return 'from-cyan-400 to-blue-400';
        if (rank <= 6) return 'from-blue-400 to-purple-400';
        return 'from-purple-400 to-pink-400';
    };

    return (
        <div className="group">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-lab-text/40 font-semibold w-4">
                    {rank}
                </span>
                <span className="text-xs text-lab-text flex-1 truncate group-hover:text-lab-accent transition-colors">
                    {driver.feature}
                </span>
                <span className="text-xs text-lab-accent font-semibold font-data">
                    {driver.importance.toFixed(3)}
                </span>
            </div>

            {/* Main Bar */}
            <div className="relative h-6 bg-lab-text/5 rounded-full overflow-hidden ml-6">
                {/* Confidence Interval (Fan Chart) */}
                {hasConfidenceInterval && (
                    <div
                        className="absolute inset-y-0 left-0 bg-lab-accent/10 transition-all duration-500"
                        style={{
                            left: `${(driver.p10! * 100)}%`,
                            width: `${((driver.p90! - driver.p10!) * 100)}%`
                        }}
                    />
                )}

                {/* Importance Bar */}
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 bg-gradient-to-r rounded-full transition-all duration-500",
                        getColor(rank)
                    )}
                    style={{ width: `${driver.importance * 100}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Subtractive Design Wrapper for Recharts
 * Removes gridlines, shadows, and other non-data ink
 */
export function SubtractiveChartWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="data-ink-optimized no-chart-decoration">
            {children}
        </div>
    );
}
