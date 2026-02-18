import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "red";
}

const COLOR_MAP = {
  blue: "bg-teal-500/10 text-teal-500",
  green: "bg-green-500/10 text-green-500",
  yellow: "bg-yellow-500/10 text-yellow-500",
  red: "bg-red-500/10 text-red-500",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  color = "blue",
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            COLOR_MAP[color],
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
