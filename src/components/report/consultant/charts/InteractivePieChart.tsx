import { useState } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Sector,
} from "recharts";

interface DataPoint {
  name: string;
  value: number;
}

interface InteractivePieChartProps {
  data: DataPoint[];
  height?: number;
}

const COLORS = [
  "hsl(220, 45%, 15%)",   // Navy
  "hsl(22, 50%, 50%)",    // Copper
  "hsl(220, 10%, 60%)",   // Slate
  "hsl(145, 60%, 42%)",   // Success
  "hsl(38, 85%, 52%)",    // Warning
  "hsl(200, 80%, 48%)",   // Info
];

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="hsl(220, 45%, 15%)"
        className="font-serif text-lg font-bold"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 15}
        textAnchor="middle"
        fill="hsl(22, 50%, 50%)"
        className="text-2xl font-bold"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
};

export function InteractivePieChart({ data, height = 350 }: InteractivePieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-sm px-3 py-2 shadow-soft">
          <p className="font-medium text-foreground">
            {payload[0].name}:{" "}
            <span className="text-copper-400">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-card p-6 rounded-sm border border-border shadow-soft flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            animationDuration={1500}
            stroke="none"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
