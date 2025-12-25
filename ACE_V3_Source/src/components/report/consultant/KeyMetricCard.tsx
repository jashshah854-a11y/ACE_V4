import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyMetricCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  target?: number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  expandable?: boolean;
  children?: React.ReactNode;
}

export function KeyMetricCard({
  label,
  value,
  change,
  changeLabel = "vs. prior",
  target,
  icon,
  trend = "neutral",
  expandable = false,
  children,
}: KeyMetricCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const trendColor = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        "bg-card border border-border rounded-sm p-6 shadow-soft transition-all duration-300",
        expandable && "cursor-pointer hover:shadow-soft-lg",
        isExpanded && "ring-1 ring-copper-400/20"
      )}
      onClick={() => expandable && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium uppercase tracking-wider">
          {icon && <span className="text-copper-400">{icon}</span>}
          {label}
        </div>
        {expandable && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-4xl font-serif font-bold text-navy-900 tracking-tight">
          {value}
        </p>

        {change !== undefined && (
          <div className={cn("flex items-center gap-1.5 text-sm", trendColor[trend])}>
            {TrendIcon && <TrendIcon className="h-4 w-4" />}
            <span className="font-medium">
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="text-muted-foreground">{changeLabel}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground overflow-hidden"
          >
            {target && (
              <div className="flex justify-between mb-2">
                <span>Target:</span>
                <span className="font-medium text-navy-900">${target}M</span>
              </div>
            )}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
