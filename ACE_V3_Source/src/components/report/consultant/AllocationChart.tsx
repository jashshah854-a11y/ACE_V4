import { useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { cn } from "@/lib/utils";
import type { AllocationDataPoint } from "@/lib/reportDataTransformer";
import { TrendingUp, Users, AlertCircle } from "lucide-react";

interface AllocationChartProps {
  data: AllocationDataPoint[];
  totalRecords: number;
  insights: string[];
  title?: string;
  className?: string;
}

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
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 14}
        outerRadius={outerRadius + 18}
        fill={fill}
        opacity={0.3}
      />
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        className="fill-navy-900 font-serif text-lg font-semibold"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        className="fill-copper-600 text-2xl font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

export function AllocationChart({
  data,
  totalRecords,
  insights,
  title = "Customer Segment Composition",
  className
}: AllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data || data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("bg-card border border-border rounded-sm shadow-soft overflow-hidden", className)}
    >
      <div className="p-6 border-b border-border bg-muted/30">
        <h3 className="font-serif text-xl font-semibold text-navy-900">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Total: {totalRecords.toLocaleString()} customers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Chart */}
        <div className="p-6 flex items-center justify-center">
          <div className="w-full max-w-[320px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={1200}
                  stroke="none"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend and Insights */}
        <div className="p-6 lg:border-l border-border bg-muted/10">
          {/* Legend */}
          <div className="space-y-3 mb-6">
            {data.map((item, index) => (
              <motion.button
                key={item.name}
                onClick={() => setActiveIndex(index)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-sm transition-colors text-left",
                  activeIndex === index ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </span>
                    <span className="text-sm text-copper-600 font-semibold shrink-0">
                      {item.value}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.count.toLocaleString()} customers
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Key Insights
              </h4>
              <ul className="space-y-2">
                {insights.map((insight, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="text-sm text-foreground flex items-start gap-2"
                  >
                    <span className="text-copper-400 mt-1">•</span>
                    {insight}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
