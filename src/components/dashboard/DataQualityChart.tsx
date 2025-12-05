import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { date: "Mon", quality: 92, issues: 8 },
  { date: "Tue", quality: 94, issues: 6 },
  { date: "Wed", quality: 91, issues: 9 },
  { date: "Thu", quality: 96, issues: 4 },
  { date: "Fri", quality: 95, issues: 5 },
  { date: "Sat", quality: 97, issues: 3 },
  { date: "Sun", quality: 98, issues: 2 },
];

export function DataQualityChart() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Data Quality Trend</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly data quality score progression
        </p>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(222 47% 16%)" 
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
            />
            <YAxis 
              domain={[80, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 47% 10%)",
                border: "1px solid hsl(222 47% 20%)",
                borderRadius: "8px",
                boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)",
              }}
              labelStyle={{ color: "hsl(210 40% 98%)" }}
              itemStyle={{ color: "hsl(217 91% 60%)" }}
              formatter={(value: number) => [`${value}%`, "Quality Score"]}
            />
            <Area
              type="monotone"
              dataKey="quality"
              stroke="hsl(217 91% 60%)"
              strokeWidth={2}
              fill="url(#qualityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Quality Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Current: 98%</span>
        </div>
      </div>
    </div>
  );
}
