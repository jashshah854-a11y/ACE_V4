import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { ComparisonToggle, type ComparisonMode } from "../ComparisonToggle";
import { cn } from "@/lib/utils";

interface DataPoint {
  name: string;
  actual: number;
  forecast?: number;
  prior?: number;
}

interface InteractiveLineChartProps {
  data: DataPoint[];
  height?: number;
  showForecast?: boolean;
  showComparisonToggle?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
}

const COLORS = {
  actual: "hsl(22, 50%, 50%)",      // Copper for current
  forecast: "hsl(168, 70%, 35%)",   // Teal for forecast
  prior: "hsl(220, 10%, 70%)",      // Slate for prior
  grid: "hsl(220, 10%, 90%)",
  text: "hsl(220, 10%, 45%)",
};

export function InteractiveLineChart({
  data,
  height = 400,
  showForecast = true,
  showComparisonToggle = true,
  title,
  subtitle,
  className,
}: InteractiveLineChartProps) {
  const [activePoint, setActivePoint] = useState<DataPoint | null>(null);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("YoY");

  const hasPriorData = data.some(d => d.prior !== undefined);
  const hasForecastData = data.some(d => d.forecast !== undefined);
  const hasForecastBand = data.some((d: any) => typeof d.forecast_lower === "number" && typeof d.forecast_upper === "number");
  const maxActualValue = useMemo(() => Math.max(...data.map((point) => point.actual ?? 0), 1), [data]);
  const forecastSpread = hasForecastBand
    ? Math.max(...data.map((point: any) => Math.abs((point.forecast_upper ?? 0) - (point.forecast_lower ?? 0))))
    : 0;
  const fogOpacity = hasForecastData
    ? Math.min(0.65, Math.max(0.2, (forecastSpread || 0.1) / Math.max(maxActualValue, 1)))
    : 0;
  const missingWindows = useMemo(() => {
    const windows: Array<{ start: string; end: string }> = [];
    let currentStart: string | null = null;
    data.forEach((point, idx) => {
      const isMissing = point.actual === null || point.actual === undefined;
      if (isMissing && currentStart === null) {
        currentStart = point.name;
      }
      if (!isMissing && currentStart !== null) {
        windows.push({ start: currentStart, end: data[idx - 1]?.name || currentStart });
        currentStart = null;
      }
    });
    if (currentStart !== null) {
      windows.push({ start: currentStart, end: data[data.length - 1]?.name || currentStart });
    }
    return windows;
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm px-4 py-3 shadow-soft">
          <p className="text-xs text-muted-foreground font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground">{entry.dataKey}:</span>
              <span className="font-semibold text-foreground">${entry.value}M</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("bg-card border border-border rounded-sm shadow-soft overflow-hidden", className)}
    >
      {/* Header */}
      <div className="p-6 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {title && (
            <h3 className="font-serif text-xl font-semibold text-navy-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {showComparisonToggle && hasPriorData && (
          <ComparisonToggle value={comparisonMode} onChange={setComparisonMode} />
        )}
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            onMouseMove={(state) => {
              if (state?.activePayload?.[0]) {
                setActivePoint(state.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setActivePoint(null)}
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.actual} stopOpacity={0.15} />
                <stop offset="95%" stopColor={COLORS.actual} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.forecast} stopOpacity={fogOpacity} />
                <stop offset="95%" stopColor={COLORS.forecast} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.text, fontSize: 11 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.text, fontSize: 11 }}
              width={50}
              tickFormatter={(value) => `$${value}M`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground capitalize">{value}</span>
              )}
            />

            {/* Area fill for actual */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="none"
              fill="url(#actualGradient)"
            />

            {/* Forecast area */}
            {showForecast && hasForecastData && (
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="none"
                fill="url(#forecastGradient)"
                fillOpacity={fogOpacity}
              />
            )}
            {showForecast && hasForecastBand && (
              <Area
                type="monotone"
                dataKey="forecast_upper"
                stroke="none"
                fill="url(#forecastGradient)"
                fillOpacity={fogOpacity}
              />
            )}

            {/* Prior year line */}
            {hasPriorData && (
              <Line
                type="monotone"
                dataKey="prior"
                name={comparisonMode}
                stroke={COLORS.prior}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                animationDuration={1500}
              />
            )}

            {/* Current period line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Current"
              stroke={COLORS.actual}
              strokeWidth={2.5}
              dot={{ fill: COLORS.actual, strokeWidth: 0, r: 4 }}
              activeDot={{ fill: COLORS.actual, strokeWidth: 3, stroke: "#fff", r: 7 }}
              connectNulls={false}
              animationDuration={2000}
            />

            {/* Forecast line */}
            {showForecast && hasForecastData && (
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke={COLORS.forecast}
                strokeWidth={fogOpacity > 0.4 ? 1 : 2}
                strokeDasharray="8 4"
                dot={false}
                connectNulls={false}
                animationDuration={2000}
              />
            )}

            {missingWindows.map((window, idx) => (
              <ReferenceArea key={`${window.start}-${idx}`} x1={window.start} x2={window.end} strokeOpacity={0} fill="rgba(250,204,21,0.15)" />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>

        {/* Active point details */}
        <AnimatePresence>
          {activePoint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 pt-4 border-t border-border"
            >
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-muted-foreground">Period:</span>{" "}
                  <span className="font-medium text-foreground">{activePoint.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current:</span>{" "}
                  <span className="font-semibold text-copper-600">${activePoint.actual}M</span>
                </div>
                {activePoint.prior !== undefined && (
                  <div>
                    <span className="text-muted-foreground">{comparisonMode}:</span>{" "}
                    <span className="font-medium text-foreground">${activePoint.prior}M</span>
                    {activePoint.actual && (
                      <span className={cn(
                        "ml-2 text-xs font-medium",
                        activePoint.actual > activePoint.prior ? "text-teal-500" : "text-destructive"
                      )}>
                        {activePoint.actual > activePoint.prior ? "+" : ""}
                        {(((activePoint.actual - activePoint.prior) / activePoint.prior) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
                {activePoint.forecast !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Forecast:</span>{" "}
                    <span className="font-medium text-teal-500">${activePoint.forecast}M</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {missingWindows.length > 0 && (
        <div className="mt-3 text-xs text-amber-700">
          {missingWindows.map((window, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-semibold">Data Missing</span>
              <span>
                {window.start === window.end ? window.start : `${window.start} -> ${window.end}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
