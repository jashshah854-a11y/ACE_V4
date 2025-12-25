import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Label,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
  annotation?: string;
}

interface InteractiveBarChartProps {
  data: DataPoint[];
  height?: number;
  showTarget?: boolean;
  targetValue?: number;
}

const COLORS = {
  default: "hsl(220, 10%, 60%)",
  active: "hsl(22, 50%, 50%)",
  latest: "hsl(220, 45%, 15%)",
};

export function InteractiveBarChart({
  data,
  height = 350,
  showTarget = false,
  targetValue = 60,
}: InteractiveBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleBarClick = (_: unknown, index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const selectedData = activeIndex !== null ? data[activeIndex] : null;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DataPoint }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm px-3 py-2 shadow-soft">
          <p className="text-sm font-medium text-foreground">
            {payload[0].payload.name}: <span className="text-copper-400">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="w-full bg-card p-6 rounded-sm border border-border shadow-soft">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 11, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 45%)", fontSize: 11 }}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "hsl(220, 10%, 96%)", opacity: 0.5 }}
            />
            {showTarget && (
              <ReferenceLine y={targetValue} stroke="hsl(0, 65%, 55%)" strokeDasharray="3 3">
                <Label value="Target" position="right" fill="hsl(0, 65%, 55%)" fontSize={10} />
              </ReferenceLine>
            )}
            <Bar
              dataKey="value"
              radius={[2, 2, 0, 0]}
              animationDuration={1500}
              onClick={handleBarClick}
              cursor="pointer"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    activeIndex === index
                      ? COLORS.active
                      : index === data.length - 1
                      ? COLORS.latest
                      : COLORS.default
                  }
                  fillOpacity={activeIndex !== null && activeIndex !== index ? 0.3 : 1}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      <AnimatePresence mode="wait">
        {selectedData && selectedData.annotation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-navy-50 border-l-4 border-primary p-4 rounded-r-sm"
          >
            <h4 className="font-serif text-navy-900 font-medium mb-1">
              Insight: {selectedData.name} Performance
            </h4>
            <p className="text-sm text-muted-foreground">{selectedData.annotation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
