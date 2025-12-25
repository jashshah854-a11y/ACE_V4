import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart3, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricCardData } from "@/lib/reportDataTransformer";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface MetricCardRowProps {
  metrics: MetricCardData[];
  className?: string;
}

const iconMap = {
  dollar: DollarSign,
  users: Users,
  chart: BarChart3,
  quality: Shield,
  alert: AlertTriangle
};

export function MetricCardRow({ metrics, className }: MetricCardRowProps) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {metrics.map((metric, index) => (
        <MetricCard key={metric.id} metric={metric} index={index} />
      ))}
    </div>
  );
}

interface MetricCardProps {
  metric: MetricCardData;
  index: number;
}

function MetricCard({ metric, index }: MetricCardProps) {
  const Icon = iconMap[metric.icon] || BarChart3;
  
  const trendColor = {
    up: "text-teal-500",
    down: "text-destructive",
    neutral: "text-muted-foreground"
  };
  
  const trendBg = {
    up: "bg-teal-50",
    down: "bg-destructive/10",
    neutral: "bg-muted"
  };

  const TrendIcon = metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : null;

  // Prepare sparkline data
  const sparklineData = metric.sparklineData?.map((value, i) => ({ value, index: i })) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-card border border-border rounded-sm p-5 shadow-soft hover:shadow-soft-lg transition-shadow duration-300"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-sm bg-copper-50">
          <Icon className="h-4 w-4 text-copper-600" />
        </div>
        
        {metric.change !== undefined && (
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", trendBg[metric.trend], trendColor[metric.trend])}>
            {TrendIcon && <TrendIcon className="h-3 w-3" />}
            {metric.change > 0 ? "+" : ""}{metric.change.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        <p className="text-3xl font-serif font-bold text-navy-900 tracking-tight">
          {metric.value}
        </p>
      </div>

      {/* Label */}
      <p className="text-sm text-muted-foreground mb-3">
        {metric.label}
        {metric.changeLabel && metric.change !== undefined && (
          <span className="text-xs ml-1">({metric.changeLabel})</span>
        )}
      </p>

      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`sparkline-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--copper-400))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--copper-400))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--copper-400))"
                strokeWidth={1.5}
                fill={`url(#sparkline-${metric.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progress bar */}
      {metric.progress !== undefined && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className="font-medium text-foreground">{metric.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                metric.progress >= 85 ? "bg-teal-500" : metric.progress >= 60 ? "bg-copper-400" : "bg-destructive"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metric.progress)}%` }}
              transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
