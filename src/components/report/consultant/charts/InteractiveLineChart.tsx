import { useState, useMemo } from "react";
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
} from "recharts";
import type { ComparisonMode } from "../ComparisonToggle";

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
  comparisonMode?: ComparisonMode;
}

const COLORS = {
  actual: "hsl(220, 45%, 15%)",
  forecast: "hsl(22, 50%, 50%)",
  prior: "hsl(220, 10%, 70%)",
};

export function InteractiveLineChart({
  data,
  height = 400,
  showForecast = false,
  comparisonMode = "YoY",
}: InteractiveLineChartProps) {
  const [activePoint, setActivePoint] = useState<DataPoint | null>(null);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm px-4 py-3 shadow-soft">
          <p className="text-xs text-muted-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm">
              <span className="font-medium capitalize">{entry.dataKey}:</span>{" "}
              <span className="text-copper-400 font-semibold">${entry.value}M</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-card p-6 rounded-sm border border-border shadow-soft">
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
              <stop offset="5%" stopColor={COLORS.actual} stopOpacity={0.1} />
              <stop offset="95%" stopColor={COLORS.actual} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 90%)" vertical={false} />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 11 }}
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

          <Area
            type="monotone"
            dataKey="actual"
            stroke="none"
            fill="url(#actualGradient)"
          />

          <Line
            type="monotone"
            dataKey="actual"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={{ fill: COLORS.actual, strokeWidth: 0, r: 3 }}
            activeDot={{ fill: COLORS.actual, strokeWidth: 2, stroke: "#fff", r: 6 }}
            animationDuration={2000}
          />

          {data[0]?.prior !== undefined && (
            <Line
              type="monotone"
              dataKey="prior"
              stroke={COLORS.prior}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={2000}
            />
          )}

          {showForecast && data[0]?.forecast !== undefined && (
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={COLORS.forecast}
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={false}
              animationDuration={2000}
            />
          )}
        </RechartsLineChart>
      </ResponsiveContainer>

      <AnimatePresence>
        {activePoint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Period:</span>{" "}
                <span className="font-medium text-foreground">{activePoint.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue:</span>{" "}
                <span className="font-semibold text-copper-600">${activePoint.actual}M</span>
              </div>
              {activePoint.prior && (
                <div>
                  <span className="text-muted-foreground">{comparisonMode}:</span>{" "}
                  <span className="font-medium text-foreground">${activePoint.prior}M</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
